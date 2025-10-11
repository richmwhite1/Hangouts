"use client"
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth-context'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
// Type definitions
interface PollData {
  id: string
  title: string
  description?: string
  options: PollOption[]
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  consensusConfig: ConsensusConfig
  participants: PollParticipant[]
  votes: PollVote[]
  createdAt: string
  updatedAt: string
}
interface PollOption {
  id: string
  text: string
  description?: string
  order: number
}
interface PollParticipant {
  id: string
  userId: string
  status: 'INVITED' | 'VOTED' | 'ABSTAINED'
  canVote: boolean
  canDelegate: boolean
}
interface PollVote {
  id: string
  userId: string
  optionId: string
  weight: number
  createdAt: string
}
interface ConsensusConfig {
  consensusType: 'PERCENTAGE' | 'ABSOLUTE' | 'MAJORITY' | 'SUPERMAJORITY' | 'QUADRATIC' | 'CONDORCET' | 'CUSTOM'
  threshold: number
  minParticipants: number
  timeLimit?: number
  allowTies: boolean
  tieBreaker?: string
  customRules?: Record<string, unknown>
}
interface VoteData {
  optionId: string
  weight?: number
  delegation?: string
}
interface Message {
  id: string
  userId: string
  content: string
  timestamp: string
  type: 'text' | 'image' | 'poll' | 'system'
}
interface RSVPData {
  userId: string
  status: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
  timestamp: string
}
interface HangoutData {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  participants: Array<{
    id: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
  }>
}
interface Notification {
  id: string
  type: 'hangout_invite' | 'poll_created' | 'vote_cast' | 'consensus_reached' | 'message'
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  createdAt: string
}
interface RealtimeContextType {
  socket: Socket | null
  isConnected: boolean
  connectionError: string | null
  reconnectAttempts: number
  // Hangout management
  joinHangout: (hangoutId: string) => void
  leaveHangout: (hangoutId: string) => void
  sendMessage: (hangoutId: string, message: string) => void
  // Poll management
  joinPoll: (pollId: string) => void
  leavePoll: (pollId: string) => void
  createPoll: (data: Omit<PollData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PollData>
  // Voting
  castVote: (pollId: string, voteData: VoteData) => Promise<PollVote>
  changeVote: (pollId: string, voteData: VoteData) => Promise<PollVote>
  deleteVote: (pollId: string) => Promise<void>
  // Participant management
  updateParticipantStatus: (pollId: string, status: PollParticipant['status']) => void
  delegateVote: (pollId: string, delegateId: string) => Promise<void>
  revokeDelegation: (pollId: string) => Promise<void>
  // Event handlers - Hangouts
  onMessage: (callback: (message: Message) => void) => void
  offMessage: (callback: (message: Message) => void) => void
  onRSVPUpdate: (callback: (data: RSVPData) => void) => void
  offRSVPUpdate: (callback: (data: RSVPData) => void) => void
  onHangoutUpdate: (callback: (hangout: HangoutData) => void) => void
  offHangoutUpdate: (callback: (hangout: HangoutData) => void) => void
  onParticipantJoined: (callback: (data: { userId: string; hangoutId: string }) => void) => void
  offParticipantJoined: (callback: (data: { userId: string; hangoutId: string }) => void) => void
  onParticipantLeft: (callback: (data: { userId: string; hangoutId: string }) => void) => void
  offParticipantLeft: (callback: (data: { userId: string; hangoutId: string }) => void) => void
  onNotification: (callback: (notification: Notification) => void) => void
  offNotification: (callback: (notification: Notification) => void) => void
  // Event handlers - Polling
  onPollCreated: (callback: (data: PollData) => void) => void
  offPollCreated: (callback: (data: PollData) => void) => void
  onPollUpdated: (callback: (data: PollData) => void) => void
  offPollUpdated: (callback: (data: PollData) => void) => void
  onVoteCast: (callback: (data: { pollId: string; vote: PollVote }) => void) => void
  offVoteCast: (callback: (data: { pollId: string; vote: PollVote }) => void) => void
  onConsensusProgress: (callback: (data: { pollId: string; progress: number }) => void) => void
  offConsensusProgress: (callback: (data: { pollId: string; progress: number }) => void) => void
  onConsensusReached: (callback: (data: { pollId: string; result: string }) => void) => void
  offConsensusReached: (callback: (data: { pollId: string; result: string }) => void) => void
  onPollError: (callback: (data: { pollId: string; error: string }) => void) => void
  offPollError: (callback: (data: { pollId: string; error: string }) => void) => void
}
const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)
interface RealtimeProviderProps {
  children: React.ReactNode
}
export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const { user, isAuthenticated } = useAuth()
  const eventCallbacks = useRef<Map<string, Set<Function>>>(new Map())
  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'), {
        path: '/api/socket',
        auth: { userId: user.id },
        transports: ['polling', 'websocket'],
        timeout: 2000,
        retries: 3,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
        maxReconnectionAttempts: 3,
        forceNew: true,
      })

      newSocket.on('connect', () => {
        // console.log('🔌 Realtime WebSocket connected'); // Removed for production
        setIsConnected(true)
        setConnectionError(null)
        setReconnectAttempts(0)
        // Authenticate with the server
        newSocket.emit('authenticate', { userId: user.id })
      })

      newSocket.on('disconnect', () => {
        // console.log('🔌 Realtime WebSocket disconnected'); // Removed for production
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        logger.error('🔌 Realtime WebSocket connection error:', error);
        setConnectionError(error.message)
        setReconnectAttempts(prev => prev + 1)
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
      }
    } else {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, user?.id])
  // Hangout management
  const joinHangout = useCallback((hangoutId: string) => {
    if (socket && isConnected) {
      socket.emit('join-hangout', hangoutId)
      // console.log('Joined hangout room:', hangoutId); // Removed for production
    }
  }, [socket, isConnected])
  const leaveHangout = useCallback((hangoutId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-hangout', hangoutId)
      // console.log('Left hangout room:', hangoutId); // Removed for production
    }
  }, [socket, isConnected])
  const sendMessage = useCallback((hangoutId: string, message: string) => {
    if (socket && isConnected) {
      socket.emit('send-message', { hangoutId, message })
    }
  }, [socket, isConnected])
  // Poll management
  const joinPoll = useCallback((pollId: string) => {
    if (socket && isConnected) {
      socket.emit('joinPoll', { pollId })
      // console.log('Joined poll room:', pollId); // Removed for production
    }
  }, [socket, isConnected])
  const leavePoll = useCallback((pollId: string) => {
    if (socket && isConnected) {
      socket.emit('leavePoll', { pollId })
      // console.log('Left poll room:', pollId); // Removed for production
    }
  }, [socket, isConnected])
  const createPoll = useCallback(async (data: Omit<PollData, 'id' | 'createdAt' | 'updatedAt'>): Promise<PollData> => {
    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create poll')
      }
      return await response.json() as PollData
    } catch (error) {
      logger.error('Error creating poll:', error);
      throw error
    }
  }, [])
  // Voting
  const castVote = useCallback(async (pollId: string, voteData: VoteData): Promise<PollVote> => {
    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cast vote')
      }
      return await response.json() as PollVote
    } catch (error) {
      logger.error('Error casting vote:', error);
      throw error
    }
  }, [])
  const changeVote = useCallback(async (pollId: string, voteData: VoteData): Promise<PollVote> => {
    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change vote')
      }
      return await response.json() as PollVote
    } catch (error) {
      logger.error('Error changing vote:', error);
      throw error
    }
  }, [])
  const deleteVote = useCallback(async (pollId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete vote')
      }
    } catch (error) {
      logger.error('Error deleting vote:', error);
      throw error
    }
  }, [])
  // Participant management
  const updateParticipantStatus = useCallback((pollId: string, status: PollParticipant['status']) => {
    if (socket && isConnected) {
      socket.emit('updateParticipantStatus', { pollId, status })
    }
  }, [socket, isConnected])
  const delegateVote = useCallback(async (pollId: string, delegateId: string): Promise<void> => {
    if (socket && isConnected) {
      socket.emit('delegateVote', { pollId, delegateId })
    }
  }, [socket, isConnected])
  const revokeDelegation = useCallback(async (pollId: string): Promise<void> => {
    if (socket && isConnected) {
      socket.emit('revokeDelegation', { pollId })
    }
  }, [socket, isConnected])
  // Event subscription management
  const createEventHandler = (eventName: string) => (callback: (data: unknown) => void) => {
    if (!eventCallbacks.current.has(eventName)) {
      eventCallbacks.current.set(eventName, new Set())
    }
    eventCallbacks.current.get(eventName)!.add(callback)
  }
  const createEventUnhandler = (eventName: string) => (callback: (data: unknown) => void) => {
    const callbacks = eventCallbacks.current.get(eventName)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }
  // Hangout event handlers
  const onMessage = createEventHandler('message')
  const offMessage = createEventUnhandler('message')
  const onRSVPUpdate = createEventHandler('rsvp-updated')
  const offRSVPUpdate = createEventUnhandler('rsvp-updated')
  const onHangoutUpdate = createEventHandler('hangout-updated')
  const offHangoutUpdate = createEventUnhandler('hangout-updated')
  const onParticipantJoined = createEventHandler('participant-joined')
  const offParticipantJoined = createEventUnhandler('participant-joined')
  const onParticipantLeft = createEventHandler('participant-left')
  const offParticipantLeft = createEventUnhandler('participant-left')
  const onNotification = createEventHandler('notification')
  const offNotification = createEventUnhandler('notification')
  // Polling event handlers
  const onPollCreated = createEventHandler('pollCreated')
  const offPollCreated = createEventUnhandler('pollCreated')
  const onPollUpdated = createEventHandler('pollUpdated')
  const offPollUpdated = createEventUnhandler('pollUpdated')
  const onVoteCast = createEventHandler('voteCast')
  const offVoteCast = createEventUnhandler('voteCast')
  const onConsensusProgress = createEventHandler('consensusProgress')
  const offConsensusProgress = createEventUnhandler('consensusProgress')
  const onConsensusReached = createEventHandler('consensusReached')
  const offConsensusReached = createEventUnhandler('consensusReached')
  const onPollError = createEventHandler('pollError')
  const offPollError = createEventUnhandler('pollError')
  const value: RealtimeContextType = {
    socket,
    isConnected,
    connectionError,
    reconnectAttempts,
    joinHangout,
    leaveHangout,
    sendMessage,
    joinPoll,
    leavePoll,
    createPoll,
    castVote,
    changeVote,
    deleteVote,
    updateParticipantStatus,
    delegateVote,
    revokeDelegation,
    onMessage,
    offMessage,
    onRSVPUpdate,
    offRSVPUpdate,
    onHangoutUpdate,
    offHangoutUpdate,
    onParticipantJoined,
    offParticipantJoined,
    onParticipantLeft,
    offParticipantLeft,
    onNotification,
    offNotification,
    onPollCreated,
    offPollCreated,
    onPollUpdated,
    offPollUpdated,
    onVoteCast,
    offVoteCast,
    onConsensusProgress,
    offConsensusProgress,
    onConsensusReached,
    offConsensusReached,
    onPollError,
    offPollError
  }
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}
export const useRealtime = () => {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}
// Legacy hooks for backward compatibility
export const useSocket = () => {
  const context = useRealtime()
  return {
    socket: context.socket,
    isConnected: context.isConnected,
    connectionError: context.connectionError,
    reconnectAttempts: context.reconnectAttempts,
    joinHangout: context.joinHangout,
    leaveHangout: context.leaveHangout,
    sendMessage: context.sendMessage,
    onMessage: context.onMessage,
    offMessage: context.offMessage,
    onRSVPUpdate: context.onRSVPUpdate,
    offRSVPUpdate: context.offRSVPUpdate,
    onHangoutUpdate: context.onHangoutUpdate,
    offHangoutUpdate: context.offHangoutUpdate,
    onParticipantJoined: context.onParticipantJoined,
    offParticipantJoined: context.offParticipantJoined,
    onParticipantLeft: context.onParticipantLeft,
    offParticipantLeft: context.offParticipantLeft,
    onNotification: context.onNotification,
    offNotification: context.offNotification
  }
}
export const usePolling = () => {
  const context = useRealtime()
  return {
    socket: context.socket,
    isConnected: context.isConnected,
    connectionError: context.connectionError,
    reconnectAttempts: context.reconnectAttempts,
    joinPoll: context.joinPoll,
    leavePoll: context.leavePoll,
    createPoll: context.createPoll,
    castVote: context.castVote,
    changeVote: context.changeVote,
    deleteVote: context.deleteVote,
    updateParticipantStatus: context.updateParticipantStatus,
    delegateVote: context.delegateVote,
    revokeDelegation: context.revokeDelegation,
    onPollCreated: context.onPollCreated,
    offPollCreated: context.offPollCreated,
    onPollUpdated: context.onPollUpdated,
    offPollUpdated: context.offPollUpdated,
    onVoteCast: context.onVoteCast,
    offVoteCast: context.offVoteCast,
    onConsensusProgress: context.onConsensusProgress,
    offConsensusProgress: context.offConsensusProgress,
    onConsensusReached: context.onConsensusReached,
    offConsensusReached: context.offConsensusReached,
    onParticipantJoined: context.onParticipantJoined,
    offParticipantJoined: context.offParticipantJoined,
    onPollError: context.onPollError,
    offPollError: context.offPollError
  }
}