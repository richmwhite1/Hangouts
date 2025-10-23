import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

import { logger } from '@/lib/logger'
const prisma = new PrismaClient()

interface AuthenticatedSocket {
  userId: string
  username: string
  hangoutId?: string
  pollId?: string
}

interface PollingServerToClientEvents {
  // Poll events
  pollCreated: (data: { poll: any; participants: any[] }) => void
  pollUpdated: (data: { poll: any; changes: any }) => void
  pollClosed: (data: { pollId: string; reason: string; results: any }) => void
  
  // Vote events
  voteCast: (data: { 
    pollId: string
    optionId: string
    userId: string
    voteType: string
    sentiment?: string
    comment?: string
    voteCount: number
    consensusLevel: number
  }) => void
  
  voteChanged: (data: { 
    pollId: string
    optionId: string
    userId: string
    oldOptionId?: string
    voteCount: number
    consensusLevel: number
  }) => void
  
  voteDeleted: (data: { 
    pollId: string
    userId: string
    voteCount: number
    consensusLevel: number
  }) => void
  
  // Consensus events
  consensusProgress: (data: {
    pollId: string
    consensusLevel: number
    totalVotes: number
    participantCount: number
    leadingOption?: string
    timeToConsensus?: number
    velocity: number
  }) => void
  
  consensusReached: (data: {
    pollId: string
    winningOption: any
    consensusLevel: number
    totalVotes: number
    participantCount: number
  }) => void
  
  consensusLost: (data: {
    pollId: string
    previousConsensus: number
    currentConsensus: number
    reason: string
  }) => void
  
  // Participant events
  participantJoined: (data: { 
    pollId: string
    userId: string
    username: string
    status: string
    participantCount: number
  }) => void
  
  participantLeft: (data: { 
    pollId: string
    userId: string
    username: string
    participantCount: number
  }) => void
  
  participantStatusChanged: (data: {
    pollId: string
    userId: string
    username: string
    oldStatus: string
    newStatus: string
  }) => void
  
  // Delegation events
  delegationCreated: (data: {
    pollId: string
    delegatorId: string
    delegateId: string
    delegatorName: string
    delegateName: string
  }) => void
  
  delegationRevoked: (data: {
    pollId: string
    delegatorId: string
    delegateId: string
    delegatorName: string
    delegateName: string
  }) => void
  
  // Real-time analytics
  analyticsUpdate: (data: {
    pollId: string
    metrics: {
      totalVotes: number
      participantCount: number
      consensusLevel: number
      velocity: number
      timeToConsensus?: number
      optionBreakdown: Array<{
        optionId: string
        text: string
        voteCount: number
        percentage: number
      }>
    }
  }) => void
  
  // Error events
  pollError: (data: { 
    pollId: string
    error: string
    code: string
  }) => void
}

interface PollingClientToServerEvents {
  // Authentication
  authenticate: (data: { token: string }) => void
  
  // Poll management
  joinPoll: (data: { pollId: string }) => void
  leavePoll: (data: { pollId: string }) => void
  createPoll: (data: { 
    hangoutId: string
    title: string
    description?: string
    options: Array<{ text: string; description?: string }>
    consensusConfig: any
  }) => void
  
  // Voting
  castVote: (data: { 
    pollId: string
    optionId: string
    voteType?: string
    ranking?: number
    score?: number
    weight?: number
    sentiment?: string
    comment?: string
  }) => void
  
  changeVote: (data: { 
    pollId: string
    newOptionId: string
    voteType?: string
    ranking?: number
    score?: number
    weight?: number
    sentiment?: string
    comment?: string
  }) => void
  
  deleteVote: (data: { pollId: string }) => void
  
  // Participant management
  updateParticipantStatus: (data: { 
    pollId: string
    status: 'ACTIVE' | 'VOTED' | 'ABSTAINED' | 'DELEGATED' | 'EXCLUDED'
  }) => void
  
  // Delegation
  delegateVote: (data: { 
    pollId: string
    delegateId: string
  }) => void
  
  revokeDelegation: (data: { pollId: string }) => void
  
  // Poll control (creator only)
  pausePoll: (data: { pollId: string; reason?: string }) => void
  resumePoll: (data: { pollId: string }) => void
  closePoll: (data: { pollId: string; reason?: string }) => void
  
  // Analytics
  requestAnalytics: (data: { pollId: string }) => void
}

interface InterServerEvents {
  ping: () => void
}

interface SocketData {
  user: AuthenticatedSocket
}

export type PollingServer = Server<
  PollingClientToServerEvents,
  PollingServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type PollingSocket = Parameters<PollingClientToServerEvents[keyof PollingClientToServerEvents]>[0] extends { socket: infer S } ? S : never

class PollingWebSocketManager {
  private io: PollingServer | null = null
  private connectedUsers = new Map<string, AuthenticatedSocket>()
  private userSockets = new Map<string, string[]>() // userId -> socketIds[]
  private pollRooms = new Map<string, Set<string>>() // pollId -> userIds
  private pollParticipants = new Map<string, Map<string, any>>() // pollId -> userId -> participant data
  private consensusCache = new Map<string, any>() // pollId -> consensus data

  initialize(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: "/api/polling-socket"
    })

    this.setupEventHandlers()
    // console.log('Polling WebSocket server initialized'); // Removed for production
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', (socket) => {
      // console.log('Polling client connected:', socket.id); // Removed for production

      // Authentication
      socket.on('authenticate', (data) => {
        try {
          // TODO: Implement Clerk token verification
          // For now, accept the token and validate later
          const decoded = data as any
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
          
          // // console.log(`User ${user.username} authenticated for polling`); // Removed for production; // Removed for production
        } catch (error) {
          logger.error('Polling authentication failed:', error);
          socket.disconnect()
        }
      })

      // Poll management
      socket.on('joinPoll', async (data) => {
        if (!socket.data.user) return
        
        const { pollId } = data
        socket.join(`poll:${pollId}`)
        socket.data.user.pollId = pollId
        
        // Track poll room
        if (!this.pollRooms.has(pollId)) {
          this.pollRooms.set(pollId, new Set())
        }
        this.pollRooms.get(pollId)!.add(socket.data.user.userId)
        
        // Update participant status
        await this.updateParticipantStatus(pollId, socket.data.user.userId, 'ACTIVE')
        
        // Send current poll state
        await this.sendPollState(socket, pollId)
        
        // // console.log(`User ${socket.data.user.username} joined poll ${pollId}`); // Removed for production; // Removed for production
      })

      socket.on('leavePoll', async (data) => {
        if (!socket.data.user) return
        
        const { pollId } = data
        socket.leave(`poll:${pollId}`)
        
        // Remove from poll room tracking
        if (this.pollRooms.has(pollId)) {
          this.pollRooms.get(pollId)!.delete(socket.data.user.userId)
        }
        
        // // console.log(`User ${socket.data.user.username} left poll ${pollId}`); // Removed for production; // Removed for production
      })

      // Voting
      socket.on('castVote', async (data) => {
        if (!socket.data.user) return
        
        try {
          const result = await this.castVote(socket.data.user, data)
          if (result.success) {
            // Broadcast vote to all participants
            this.broadcastVoteCast(pollId, result.vote)
            
            // Update consensus and broadcast
            await this.updateConsensus(pollId)
          } else {
            socket.emit('pollError', {
              pollId: data.pollId,
              error: result.error,
              code: result.code
            })
          }
        } catch (error) {
          logger.error('Error casting vote:', error);
          socket.emit('pollError', {
            pollId: data.pollId,
            error: 'Failed to cast vote',
            code: 'VOTE_ERROR'
          })
        }
      })

      socket.on('changeVote', async (data) => {
        if (!socket.data.user) return
        
        try {
          const result = await this.changeVote(socket.data.user, data)
          if (result.success) {
            this.broadcastVoteChanged(pollId, result.vote)
            await this.updateConsensus(pollId)
          } else {
            socket.emit('pollError', {
              pollId: data.pollId,
              error: result.error,
              code: result.code
            })
          }
        } catch (error) {
          logger.error('Error changing vote:', error);
        }
      })

      socket.on('deleteVote', async (data) => {
        if (!socket.data.user) return
        
        try {
          const result = await this.deleteVote(socket.data.user, data)
          if (result.success) {
            this.broadcastVoteDeleted(pollId, result.vote)
            await this.updateConsensus(pollId)
          }
        } catch (error) {
          logger.error('Error deleting vote:', error);
        }
      })

      // Participant management
      socket.on('updateParticipantStatus', async (data) => {
        if (!socket.data.user) return
        
        const { pollId, status } = data
        await this.updateParticipantStatus(pollId, socket.data.user.userId, status)
        
        this.broadcastParticipantStatusChanged(pollId, socket.data.user.userId, status)
      })

      // Delegation
      socket.on('delegateVote', async (data) => {
        if (!socket.data.user) return
        
        try {
          const result = await this.delegateVote(socket.data.user, data)
          if (result.success) {
            this.broadcastDelegationCreated(pollId, result.delegation)
          }
        } catch (error) {
          logger.error('Error delegating vote:', error);
        }
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
          } else {
            this.userSockets.set(user.userId, updatedSocketIds)
          }
        }
        
        // console.log('Polling client disconnected:', socket.id); // Removed for production
      })
    })
  }

  // Vote management methods
  private async castVote(user: AuthenticatedSocket, data: any) {
    const { pollId, optionId, voteType = 'SINGLE', ranking, score, weight = 1.0, sentiment, comment } = data
    
    try {
      // Check if poll exists and is active
      const poll = await prisma.polls.findUnique({
        where: { id: pollId },
        include: { consensusConfig: true }
      })
      
      if (!poll) {
        return { success: false, error: 'Poll not found', code: 'POLL_NOT_FOUND' }
      }
      
      if (poll.status !== 'ACTIVE') {
        return { success: false, error: 'Poll is not active', code: 'POLL_INACTIVE' }
      }
      
      // Check if user can vote
      const participant = await prisma.pollParticipant.findUnique({
        where: { pollId_userId: { pollId, userId: user.userId } }
      })
      
      if (!participant || !participant.canVote) {
        return { success: false, error: 'User cannot vote', code: 'CANNOT_VOTE' }
      }
      
      // Delete existing vote if any
      await prisma.pollVote.deleteMany({
        where: { pollId, userId: user.userId }
      })
      
      // Create new vote
      const vote = await prisma.pollVote.create({
        data: {
          pollId,
          userId: user.userId,
          option: '', // Will be populated from option
          optionId,
          voteType,
          ranking,
          score,
          weight,
          sentiment,
          comment,
          ipAddress: '', // Will be populated from request
          userAgent: '' // Will be populated from request
        }
      })
      
      // Update participant status
      await prisma.pollParticipant.update({
        where: { pollId_userId: { pollId, userId: user.userId } },
        data: { status: 'VOTED' }
      })
      
      // Create audit log
      await prisma.voteAudit.create({
        data: {
          pollId,
          userId: user.userId,
          action: 'VOTE_CAST',
          newValue: { optionId, voteType, ranking, score, weight, sentiment, comment },
          ipAddress: '',
          userAgent: ''
        }
      })
      
      return { success: true, vote }
    } catch (error) {
      logger.error('Error casting vote:', error);
      return { success: false, error: 'Database error', code: 'DATABASE_ERROR' }
    }
  }

  private async changeVote(user: AuthenticatedSocket, data: any) {
    // Similar implementation to castVote but with VOTE_CHANGED audit
    // Implementation details...
    return { success: true, vote: {} }
  }

  private async deleteVote(user: AuthenticatedSocket, data: any) {
    // Implementation for deleting votes
    return { success: true, vote: {} }
  }

  private async delegateVote(user: AuthenticatedSocket, data: any) {
    // Implementation for vote delegation
    return { success: true, delegation: {} }
  }

  // Consensus calculation
  private async updateConsensus(pollId: string) {
    try {
      const poll = await prisma.polls.findUnique({
        where: { id: pollId },
        include: {
          consensusConfig: true,
          pollOptions: {
            include: { votes: true }
          },
          participants: true
        }
      })
      
      if (!poll) return
      
      const consensus = this.calculateConsensus(poll)
      
      // Update consensus cache
      this.consensusCache.set(pollId, consensus)
      
      // Broadcast consensus update
      this.broadcastConsensusProgress(pollId, consensus)
      
      // Check if consensus reached
      if (consensus.consensusLevel >= (poll.consensusConfig?.threshold || 50)) {
        this.broadcastConsensusReached(pollId, consensus)
      }
      
      // Save to consensus history
      await prisma.consensusHistory.create({
        data: {
          pollId,
          consensusLevel: consensus.consensusLevel,
          totalVotes: consensus.totalVotes,
          participantCount: consensus.participantCount,
          leadingOption: consensus.leadingOption,
          timeToConsensus: consensus.timeToConsensus,
          velocity: consensus.velocity
        }
      })
    } catch (error) {
      logger.error('Error updating consensus:', error);
    }
  }

  private calculateConsensus(poll: any) {
    const totalVotes = poll.pollOptions.reduce((sum: number, option: any) => sum + option.votes.length, 0)
    const participantCount = poll.participants.length
    const activeParticipants = poll.participants.filter((p: any) => p.status === 'VOTED').length
    
    if (totalVotes === 0) {
      return {
        consensusLevel: 0,
        totalVotes: 0,
        participantCount,
        leadingOption: null,
        timeToConsensus: null,
        velocity: 0
      }
    }
    
    // Calculate vote distribution
    const optionBreakdown = poll.pollOptions.map((option: any) => ({
      optionId: option.id,
      text: option.text,
      voteCount: option.votes.length,
      percentage: (option.votes.length / totalVotes) * 100
    }))
    
    // Find leading option
    const leadingOption = optionBreakdown.reduce((max: any, current: any) => 
      current.voteCount > max.voteCount ? current : max
    )
    
    // Calculate consensus level based on configuration
    const consensusType = poll.consensusConfig?.consensusType || 'MAJORITY'
    let consensusLevel = 0
    
    switch (consensusType) {
      case 'PERCENTAGE':
        consensusLevel = leadingOption.percentage
        break
      case 'ABSOLUTE':
        consensusLevel = (leadingOption.voteCount / poll.consensusConfig.threshold) * 100
        break
      case 'MAJORITY':
        consensusLevel = leadingOption.percentage
        break
      case 'SUPERMAJORITY':
        consensusLevel = leadingOption.percentage
        break
      default:
        consensusLevel = leadingOption.percentage
    }
    
    // Calculate velocity (votes per minute)
    const now = new Date()
    const recentVotes = poll.pollOptions.flatMap((option: any) => 
      option.votes.filter((vote: any) => 
        (now.getTime() - new Date(vote.createdAt).getTime()) < 60000 // Last minute
      )
    )
    const velocity = recentVotes.length
    
    // Estimate time to consensus
    const timeToConsensus = this.estimateTimeToConsensus(consensusLevel, velocity, poll.consensusConfig?.threshold || 50)
    
    return {
      consensusLevel,
      totalVotes,
      participantCount: activeParticipants,
      leadingOption: leadingOption.text,
      timeToConsensus,
      velocity,
      optionBreakdown
    }
  }

  private estimateTimeToConsensus(currentConsensus: number, velocity: number, threshold: number) {
    if (velocity === 0 || currentConsensus >= threshold) return null
    
    const remainingConsensus = threshold - currentConsensus
    const estimatedMinutes = remainingConsensus / (velocity * 0.1) // Rough estimation
    
    return Math.max(0, Math.round(estimatedMinutes))
  }

  // Broadcasting methods
  private broadcastVoteCast(pollId: string, vote: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('voteCast', vote)
  }

  private broadcastVoteChanged(pollId: string, vote: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('voteChanged', vote)
  }

  private broadcastVoteDeleted(pollId: string, vote: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('voteDeleted', vote)
  }

  private broadcastConsensusProgress(pollId: string, consensus: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('consensusProgress', {
      pollId,
      ...consensus
    })
  }

  private broadcastConsensusReached(pollId: string, consensus: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('consensusReached', {
      pollId,
      winningOption: consensus.leadingOption,
      ...consensus
    })
  }

  private broadcastParticipantStatusChanged(pollId: string, userId: string, status: string) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('participantStatusChanged', {
      pollId,
      userId,
      status
    })
  }

  private broadcastDelegationCreated(pollId: string, delegation: any) {
    if (!this.io) return
    this.io.to(`poll:${pollId}`).emit('delegationCreated', {
      pollId,
      ...delegation
    })
  }

  private async sendPollState(socket: any, pollId: string) {
    try {
      const poll = await prisma.polls.findUnique({
        where: { id: pollId },
        include: {
          pollOptions: {
            include: { votes: true },
            orderBy: { order: 'asc' }
          },
          participants: {
            include: { user: true }
          },
          consensusConfig: true,
          consensusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })
      
      if (poll) {
        const consensus = this.calculateConsensus(poll)
        socket.emit('pollUpdated', {
          poll,
          changes: { consensus }
        })
      }
    } catch (error) {
      logger.error('Error sending poll state:', error);
    }
  }

  private async updateParticipantStatus(pollId: string, userId: string, status: string) {
    try {
      await prisma.pollParticipant.upsert({
        where: { pollId_userId: { pollId, userId } },
        update: { status, lastActiveAt: new Date() },
        create: {
          pollId,
          userId,
          status,
          canVote: true,
          canDelegate: false,
          joinedAt: new Date(),
          lastActiveAt: new Date()
        }
      })
    } catch (error) {
      logger.error('Error updating participant status:', error);
    }
  }

  // Public methods
  getConnectedUsers(): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values())
  }

  getUserSockets(userId: string): string[] {
    return this.userSockets.get(userId) || []
  }

  getPollParticipants(pollId: string): string[] {
    return Array.from(this.pollRooms.get(pollId) || [])
  }
}

export const pollingWSManager = new PollingWebSocketManager()
export default pollingWSManager































