"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth-context'

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
  typingUsers: { [conversationId: string]: string[] }
  onlineUsers: string[]
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void
  sendMessage: (conversationId: string, message: any) => void
  sendReaction: (conversationId: string, messageId: string, emoji: string) => void
  joinConversation: (conversationId: string) => void
  leaveConversation: (conversationId: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: string[] }>({})
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const typingTimeouts = useRef<{ [conversationId: string]: NodeJS.Timeout }>({})

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'), {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      })

      newSocket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
      })

      newSocket.on('typing:start', (data) => {
        setTypingUsers(prev => ({
          ...prev,
          [data.conversationId]: [
            ...(prev[data.conversationId] || []).filter(id => id !== data.userId),
            data.userId
          ]
        }))
      })

      newSocket.on('typing:stop', (data) => {
        setTypingUsers(prev => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || []).filter(id => id !== data.userId)
        }))
      })

      newSocket.on('message:new', (data) => {
        // Handle new message - this will be handled by individual components
        console.log('New message received:', data)
      })

      newSocket.on('message:reaction', (data) => {
        // Handle message reaction - this will be handled by individual components
        console.log('Message reaction received:', data)
      })

      newSocket.on('presence:online', (data) => {
        setOnlineUsers(prev => [...new Set([...prev, data.userId])])
      })

      newSocket.on('presence:offline', (data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId))
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, token])

  const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    if (!socket || !isConnected) return

    if (isTyping) {
      socket.emit('typing:start', { conversationId })
      
      // Clear existing timeout
      if (typingTimeouts.current[conversationId]) {
        clearTimeout(typingTimeouts.current[conversationId])
      }
      
      // Set new timeout to stop typing indicator
      typingTimeouts.current[conversationId] = setTimeout(() => {
        socket.emit('typing:stop', { conversationId })
      }, 3000)
    } else {
      socket.emit('typing:stop', { conversationId })
      
      if (typingTimeouts.current[conversationId]) {
        clearTimeout(typingTimeouts.current[conversationId])
        delete typingTimeouts.current[conversationId]
      }
    }
  }

  const sendMessage = (conversationId: string, message: any) => {
    if (!socket || !isConnected) return
    socket.emit('message:new', { conversationId, ...message })
  }

  const sendReaction = (conversationId: string, messageId: string, emoji: string) => {
    if (!socket || !isConnected) return
    socket.emit('message:reaction', { conversationId, messageId, emoji })
  }

  const joinConversation = (conversationId: string) => {
    if (!socket || !isConnected) return
    socket.emit('conversation:join', { conversationId })
  }

  const leaveConversation = (conversationId: string) => {
    if (!socket || !isConnected) return
    socket.emit('conversation:leave', { conversationId })
  }

  return (
    <WebSocketContext.Provider value={{
      socket,
      isConnected,
      typingUsers,
      onlineUsers,
      sendTypingIndicator,
      sendMessage,
      sendReaction,
      joinConversation,
      leaveConversation
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
