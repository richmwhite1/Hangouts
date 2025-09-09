"use client"

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/auth-context'
import { config } from '@/lib/config'

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { user, token, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }

    const newSocket = io(config.realtime.socketUrl, {
      auth: {
        token,
        userId: user?.id,
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      retries: 3,
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    newSocket.on('connect_error', (error) => {
      console.warn('Socket connection failed:', error.message)
      // Don't show error to user, just log it
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [isAuthenticated, token, user?.id])

  return socket
}

export const useRealtimeHangouts = () => {
  const [hangouts, setHangouts] = useState<any[]>([])
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleHangoutCreated = (hangout: any) => {
      setHangouts(prev => [hangout, ...prev])
    }

    const handleHangoutUpdated = (hangout: any) => {
      setHangouts(prev => prev.map(h => h.id === hangout.id ? hangout : h))
    }

    const handleHangoutDeleted = (hangoutId: string) => {
      setHangouts(prev => prev.filter(h => h.id !== hangoutId))
    }

    socket.on('hangout:created', handleHangoutCreated)
    socket.on('hangout:updated', handleHangoutUpdated)
    socket.on('hangout:deleted', handleHangoutDeleted)

    return () => {
      socket.off('hangout:created', handleHangoutCreated)
      socket.off('hangout:updated', handleHangoutUpdated)
      socket.off('hangout:deleted', handleHangoutDeleted)
    }
  }, [socket])

  return { hangouts, setHangouts }
}

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([])
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev])
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket])

  return { notifications, setNotifications }
}
