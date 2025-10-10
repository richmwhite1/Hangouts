"use client"

import { useEffect, useCallback, useRef, useState } from 'react'
import { useRealtime } from '@/contexts/realtime-context'
import { useHangouts } from '@/contexts/hangout-context'
import { Content as Hangout } from '@/types/api'

export const useRealtimeHangouts = () => {
  const { socket, isConnected, onHangoutUpdate, offHangoutUpdate } = useRealtime()
  const { state, updateHangout, addHangout, removeHangout } = useHangouts()
  const callbacksRef = useRef<Set<(hangout: Hangout, updatedBy: Record<string, unknown>) => void>>(new Set())

  // Handle hangout updates
  const handleHangoutUpdate = useCallback((data: { hangoutId: string; updates: Record<string, unknown>; updatedBy: Record<string, unknown> }) => {
    const updatedHangout = {
      ...state.hangouts.find(h => h.id === data.hangoutId),
      ...data.updates
    } as Hangout

    if (updatedHangout) {
      updateHangout(data.hangoutId, data.updates)
    }

    // Notify all callbacks
    callbacksRef.current.forEach(callback => {
      try {
        callback(updatedHangout, data.updatedBy)
      } catch (error) {
        console.error('Error in hangout update callback:', error)
      }
    })
  }, [state.hangouts, updateHangout])

  // Subscribe to hangout updates
  useEffect(() => {
    if (!socket || !isConnected) return

    onHangoutUpdate(handleHangoutUpdate)

    return () => {
      offHangoutUpdate(handleHangoutUpdate)
    }
  }, [socket, isConnected, onHangoutUpdate, offHangoutUpdate, handleHangoutUpdate])

  // Add callback for external listeners
  const addCallback = useCallback((callback: (hangout: Hangout, updatedBy: Record<string, unknown>) => void) => {
    callbacksRef.current.add(callback)
    return () => callbacksRef.current.delete(callback)
  }, [])

  return {
    hangouts: state.hangouts,
    isConnected,
    addCallback
  }
}

export const useRealtimeMessages = (hangoutId: string) => {
  const { socket, isConnected, onMessage, offMessage } = useSocket()
  const [messages, setMessages] = useState<Array<{
    id: string
    content: string
    type: string
    createdAt: Date
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
  }>>([])

  // Handle new messages
  const handleMessage = useCallback((data: { hangoutId: string; message: Record<string, unknown> }) => {
    if (data.hangoutId === hangoutId) {
      setMessages(prev => [...prev, data.message as Record<string, unknown>])
    }
  }, [hangoutId])

  // Subscribe to messages
  useEffect(() => {
    if (!socket || !isConnected) return

    onMessage(handleMessage)

    return () => {
      offMessage(handleMessage)
    }
  }, [socket, isConnected, onMessage, offMessage, handleMessage])

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (socket && isConnected) {
      socket.emit('send-message', { hangoutId, message: content })
    }
  }, [socket, isConnected, hangoutId])

  return {
    messages,
    sendMessage,
    isConnected
  }
}

export const useRealtimeRSVP = (hangoutId: string) => {
  const { socket, isConnected, onRSVPUpdate, offRSVPUpdate } = useSocket()
  const [rsvpUpdates, setRsvpUpdates] = useState<Array<{
    hangoutId: string
    userId: string
    status: string
    user: Record<string, unknown>
    timestamp: Date
  }>>([])

  // Handle RSVP updates
  const handleRSVPUpdate = useCallback((data: { hangoutId: string; userId: string; status: string; user: Record<string, unknown> }) => {
    if (data.hangoutId === hangoutId) {
      setRsvpUpdates(prev => [...prev, {
        ...data,
        timestamp: new Date()
      }])
    }
  }, [hangoutId])

  // Subscribe to RSVP updates
  useEffect(() => {
    if (!socket || !isConnected) return

    onRSVPUpdate(handleRSVPUpdate)

    return () => {
      offRSVPUpdate(handleRSVPUpdate)
    }
  }, [socket, isConnected, onRSVPUpdate, offRSVPUpdate, handleRSVPUpdate])

  // Update RSVP
  const updateRSVP = useCallback((status: string) => {
    if (socket && isConnected) {
      socket.emit('rsvp-update', { hangoutId, status })
    }
  }, [socket, isConnected, hangoutId])

  return {
    rsvpUpdates,
    updateRSVP,
    isConnected
  }
}

export const useRealtimeNotifications = () => {
  const { socket, isConnected, onNotification, offNotification } = useSocket()
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([])

  // Handle notifications
  const handleNotification = useCallback((notification: Record<string, unknown>) => {
    setNotifications(prev => [notification, ...prev])
  }, [])

  // Subscribe to notifications
  useEffect(() => {
    if (!socket || !isConnected) return

    onNotification(handleNotification)

    return () => {
      offNotification(handleNotification)
    }
  }, [socket, isConnected, onNotification, offNotification, handleNotification])

  return {
    notifications,
    isConnected
  }
}
