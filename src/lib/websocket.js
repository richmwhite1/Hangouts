const { Server: SocketIOServer } = require('socket.io')
const { verifyToken } = require('./auth')
const { db } = require('./db')

class WebSocketServer {
  constructor(server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    })

    this.connectedUsers = new Map()
    this.userSockets = new Map()
    this.setupMiddleware()
    this.setupEventHandlers()
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Authentication required'))
        }

        const payload = verifyToken(token)
        if (!payload) {
          return next(new Error('Invalid token'))
        }

        const user = await db.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, name: true, username: true, avatar: true }
        })

        if (!user) {
          return next(new Error('User not found'))
        }

        socket.userId = user.id
        socket.user = user
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user?.name} connected with socket ${socket.id}`)
      
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id)
        
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set())
        }
        this.userSockets.get(socket.userId).add(socket.id)
      }

      this.joinUserConversations(socket)

      socket.on('typing:start', (data) => this.handleTypingStart(socket, data))
      socket.on('typing:stop', (data) => this.handleTypingStop(socket, data))
      socket.on('message:new', (data) => this.handleNewMessage(socket, data))
      socket.on('message:edit', (data) => this.handleEditMessage(socket, data))
      socket.on('message:delete', (data) => this.handleDeleteMessage(socket, data))
      socket.on('message:reaction', (data) => this.handleMessageReaction(socket, data))
      socket.on('presence:online', () => this.handleUserOnline(socket))
      socket.on('presence:away', () => this.handleUserAway(socket))
      socket.on('conversation:join', (data) => this.handleJoinConversation(socket, data))
      socket.on('conversation:leave', (data) => this.handleLeaveConversation(socket, data))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })
  }

  async joinUserConversations(socket) {
    if (!socket.userId) return

    try {
      const conversations = await db.conversation.findMany({
        where: {
          participants: {
            some: { userId: socket.userId }
          }
        },
        select: { id: true }
      })

      conversations.forEach(conversation => {
        socket.join(`conversation:${conversation.id}`)
      })

      socket.join(`user:${socket.userId}`)
    } catch (error) {
      console.error('Error joining user conversations:', error)
    }
  }

  async handleTypingStart(socket, data) {
    if (!socket.userId || !socket.user) return

    socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
      userId: socket.userId,
      user: socket.user,
      conversationId: data.conversationId
    })
  }

  async handleTypingStop(socket, data) {
    if (!socket.userId) return

    socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      userId: socket.userId,
      conversationId: data.conversationId
    })
  }

  async handleNewMessage(socket, data) {
    if (!socket.userId) return

    socket.to(`conversation:${data.conversationId}`).emit('message:new', {
      ...data,
      senderId: socket.userId,
      sender: socket.user
    })
  }

  async handleEditMessage(socket, data) {
    if (!socket.userId) return

    socket.to(`conversation:${data.conversationId}`).emit('message:edit', {
      ...data,
      editorId: socket.userId
    })
  }

  async handleDeleteMessage(socket, data) {
    if (!socket.userId) return

    socket.to(`conversation:${data.conversationId}`).emit('message:delete', {
      ...data,
      deleterId: socket.userId
    })
  }

  async handleMessageReaction(socket, data) {
    if (!socket.userId) return

    socket.to(`conversation:${data.conversationId}`).emit('message:reaction', {
      ...data,
      userId: socket.userId,
      user: socket.user
    })
  }

  async handleUserOnline(socket) {
    if (!socket.userId || !socket.user) return

    const conversations = await this.getUserConversations(socket.userId)
    
    conversations.forEach(conversationId => {
      socket.to(`conversation:${conversationId}`).emit('presence:online', {
        userId: socket.userId,
        user: socket.user
      })
    })
  }

  async handleUserAway(socket) {
    if (!socket.userId) return

    const conversations = await this.getUserConversations(socket.userId)
    
    conversations.forEach(conversationId => {
      socket.to(`conversation:${conversationId}`).emit('presence:away', {
        userId: socket.userId
      })
    })
  }

  async handleJoinConversation(socket, data) {
    socket.join(`conversation:${data.conversationId}`)
    
    socket.to(`conversation:${data.conversationId}`).emit('conversation:user_joined', {
      userId: socket.userId,
      user: socket.user,
      conversationId: data.conversationId
    })
  }

  async handleLeaveConversation(socket, data) {
    socket.leave(`conversation:${data.conversationId}`)
    
    socket.to(`conversation:${data.conversationId}`).emit('conversation:user_left', {
      userId: socket.userId,
      conversationId: data.conversationId
    })
  }

  async handleDisconnect(socket) {
    if (!socket.userId) return

    console.log(`User ${socket.user?.name} disconnected`)

    this.connectedUsers.delete(socket.userId)
    
    if (this.userSockets.has(socket.userId)) {
      this.userSockets.get(socket.userId).delete(socket.id)
      
      if (this.userSockets.get(socket.userId).size === 0) {
        this.userSockets.delete(socket.userId)
        
        const conversations = await this.getUserConversations(socket.userId)
        conversations.forEach(conversationId => {
          socket.to(`conversation:${conversationId}`).emit('presence:offline', {
            userId: socket.userId
          })
        })
      }
    }
  }

  async getUserConversations(userId) {
    try {
      const conversations = await db.conversation.findMany({
        where: {
          participants: {
            some: { userId: userId }
          }
        },
        select: { id: true }
      })

      return conversations.map(c => c.id)
    } catch (error) {
      console.error('Error getting user conversations:', error)
      return []
    }
  }

  async broadcastMessage(conversationId, message) {
    this.io.to(`conversation:${conversationId}`).emit('message:new', message)
  }

  async broadcastMessageEdit(conversationId, messageId, content) {
    this.io.to(`conversation:${conversationId}`).emit('message:edit', {
      messageId,
      content,
      editedAt: new Date().toISOString()
    })
  }

  async broadcastMessageDelete(conversationId, messageId) {
    this.io.to(`conversation:${conversationId}`).emit('message:delete', {
      messageId,
      deletedAt: new Date().toISOString()
    })
  }

  async broadcastReaction(conversationId, messageId, reaction) {
    this.io.to(`conversation:${conversationId}`).emit('message:reaction', {
      messageId,
      ...reaction
    })
  }

  async broadcastTypingIndicator(conversationId, userId, isTyping) {
    this.io.to(`conversation:${conversationId}`).emit('typing:indicator', {
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    })
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys())
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId)
  }
}

module.exports = WebSocketServer
