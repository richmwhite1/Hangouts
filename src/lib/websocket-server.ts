import { Server } from 'socket.io'
import { createServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

interface AuthenticatedSocket {
  userId: string
  username: string
  hangoutId?: string
}

interface ServerToClientEvents {
  // Poll events
  pollUpdated: (data: { pollId: string; poll: any }) => void
  voteCast: (data: { pollId: string; optionId: string; userId: string; voteCount: number }) => void
  consensusReached: (data: { pollId: string; winningOption: any }) => void
  
  // Chat events
  messageReceived: (data: { messageId: string; content: string; userId: string; username: string; timestamp: string }) => void
  userTyping: (data: { userId: string; username: string; isTyping: boolean }) => void
  
  // Notification events
  notification: (data: { type: string; title: string; message: string; data?: any }) => void
  
  // Presence events
  userJoined: (data: { userId: string; username: string }) => void
  userLeft: (data: { userId: string; username: string }) => void
  userOnline: (data: { userId: string; username: string }) => void
  userOffline: (data: { userId: string; username: string }) => void
}

interface ClientToServerEvents {
  // Authentication
  authenticate: (data: { token: string }) => void
  
  // Poll events
  joinPoll: (data: { pollId: string }) => void
  leavePoll: (data: { pollId: string }) => void
  castVote: (data: { pollId: string; optionId: string; isPreferred: boolean }) => void
  
  // Chat events
  joinChat: (data: { hangoutId: string }) => void
  leaveChat: (data: { hangoutId: string }) => void
  sendMessage: (data: { hangoutId: string; content: string }) => void
  startTyping: (data: { hangoutId: string }) => void
  stopTyping: (data: { hangoutId: string }) => void
  
  // Presence
  updatePresence: (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => void
}

interface InterServerEvents {
  ping: () => void
}

interface SocketData {
  user: AuthenticatedSocket
}

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type TypedSocket = Parameters<ClientToServerEvents[keyof ClientToServerEvents]>[0] extends { socket: infer S } ? S : never

class WebSocketManager {
  private io: TypedServer | null = null
  private connectedUsers = new Map<string, AuthenticatedSocket>()
  private userSockets = new Map<string, string[]>() // userId -> socketIds[]
  private pollRooms = new Map<string, Set<string>>() // pollId -> userIds
  private chatRooms = new Map<string, Set<string>>() // hangoutId -> userIds

  initialize(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: "/api/socket"
    })

    this.setupEventHandlers()
    console.log('WebSocket server initialized')
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Authentication
      socket.on('authenticate', (data) => {
        try {
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET!) as any
          const user: AuthenticatedSocket = {
            userId: decoded.userId,
            username: decoded.username
          }
          
          socket.data.user = user
          this.connectedUsers.set(socket.id, user)
          
          // Track user sockets
          if (!this.userSockets.has(user.userId)) {
            this.userSockets.set(user.userId, [])
          }
          this.userSockets.get(user.userId)!.push(socket.id)
          
          // Join user to their personal room
          socket.join(`user:${user.userId}`)
          
          // Notify others that user is online
          socket.broadcast.emit('userOnline', {
            userId: user.userId,
            username: user.username
          })
          
          console.log(`User ${user.username} authenticated`)
        } catch (error) {
          console.error('Authentication failed:', error)
          socket.disconnect()
        }
      })

      // Poll events
      socket.on('joinPoll', (data) => {
        if (!socket.data.user) return
        
        const { pollId } = data
        socket.join(`poll:${pollId}`)
        socket.data.user.hangoutId = pollId
        
        // Track poll room
        if (!this.pollRooms.has(pollId)) {
          this.pollRooms.set(pollId, new Set())
        }
        this.pollRooms.get(pollId)!.add(socket.data.user.userId)
        
        console.log(`User ${socket.data.user.username} joined poll ${pollId}`)
      })

      socket.on('leavePoll', (data) => {
        if (!socket.data.user) return
        
        const { pollId } = data
        socket.leave(`poll:${pollId}`)
        
        // Remove from poll room tracking
        if (this.pollRooms.has(pollId)) {
          this.pollRooms.get(pollId)!.delete(socket.data.user.userId)
        }
        
        console.log(`User ${socket.data.user.username} left poll ${pollId}`)
      })

      socket.on('castVote', async (data) => {
        if (!socket.data.user) return
        
        const { pollId, optionId, isPreferred } = data
        
        try {
          // Broadcast vote to all users in the poll room
          socket.to(`poll:${pollId}`).emit('voteCast', {
            pollId,
            optionId,
            userId: socket.data.user.userId,
            voteCount: 1 // This would be updated with actual count from database
          })
          
          console.log(`User ${socket.data.user.username} voted on poll ${pollId}`)
        } catch (error) {
          console.error('Error casting vote:', error)
        }
      })

      // Chat events
      socket.on('joinChat', (data) => {
        if (!socket.data.user) return
        
        const { hangoutId } = data
        socket.join(`chat:${hangoutId}`)
        
        // Track chat room
        if (!this.chatRooms.has(hangoutId)) {
          this.chatRooms.set(hangoutId, new Set())
        }
        this.chatRooms.get(hangoutId)!.add(socket.data.user.userId)
        
        console.log(`User ${socket.data.user.username} joined chat ${hangoutId}`)
      })

      socket.on('leaveChat', (data) => {
        if (!socket.data.user) return
        
        const { hangoutId } = data
        socket.leave(`chat:${hangoutId}`)
        
        // Remove from chat room tracking
        if (this.chatRooms.has(hangoutId)) {
          this.chatRooms.get(hangoutId)!.delete(socket.data.user.userId)
        }
        
        console.log(`User ${socket.data.user.username} left chat ${hangoutId}`)
      })

      socket.on('sendMessage', (data) => {
        if (!socket.data.user) return
        
        const { hangoutId, content } = data
        
        // Broadcast message to all users in the chat room
        socket.to(`chat:${hangoutId}`).emit('messageReceived', {
          messageId: `msg_${Date.now()}`,
          content,
          userId: socket.data.user.userId,
          username: socket.data.user.username,
          timestamp: new Date().toISOString()
        })
        
        console.log(`User ${socket.data.user.username} sent message in chat ${hangoutId}`)
      })

      socket.on('startTyping', (data) => {
        if (!socket.data.user) return
        
        const { hangoutId } = data
        socket.to(`chat:${hangoutId}`).emit('userTyping', {
          userId: socket.data.user.userId,
          username: socket.data.user.username,
          isTyping: true
        })
      })

      socket.on('stopTyping', (data) => {
        if (!socket.data.user) return
        
        const { hangoutId } = data
        socket.to(`chat:${hangoutId}`).emit('userTyping', {
          userId: socket.data.user.userId,
          username: socket.data.user.username,
          isTyping: false
        })
      })

      // Presence events
      socket.on('updatePresence', (data) => {
        if (!socket.data.user) return
        
        const { status } = data
        // Update user presence status
        console.log(`User ${socket.data.user.username} status: ${status}`)
      })

      // Disconnect handling
      socket.on('disconnect', () => {
        if (socket.data.user) {
          const user = socket.data.user
          
          // Remove from user sockets
          const userSocketIds = this.userSockets.get(user.userId) || []
          const updatedSocketIds = userSocketIds.filter(id => id !== socket.id)
          if (updatedSocketIds.length === 0) {
            this.userSockets.delete(user.userId)
            this.connectedUsers.delete(socket.id)
            
            // Notify others that user is offline
            socket.broadcast.emit('userOffline', {
              userId: user.userId,
              username: user.username
            })
          } else {
            this.userSockets.set(user.userId, updatedSocketIds)
          }
        }
        
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  // Public methods for broadcasting events
  broadcastPollUpdate(pollId: string, poll: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('pollUpdated', { pollId, poll })
  }

  broadcastVoteCast(pollId: string, optionId: string, userId: string, voteCount: number) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('voteCast', { pollId, optionId, userId, voteCount })
  }

  broadcastConsensusReached(pollId: string, winningOption: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('consensusReached', { pollId, winningOption })
  }

  broadcastMessage(hangoutId: string, message: any) {
    if (!this.io) return
    this.io.to(`chat:${hangoutId}`).emit('messageReceived', message)
  }

  sendNotification(userId: string, notification: any) {
    if (!this.io) return
    this.io.to(`user:${userId}`).emit('notification', notification)
  }

  getConnectedUsers(): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values())
  }

  getUserSockets(userId: string): string[] {
    return this.userSockets.get(userId) || []
  }
}

export const wsManager = new WebSocketManager()
export default wsManager