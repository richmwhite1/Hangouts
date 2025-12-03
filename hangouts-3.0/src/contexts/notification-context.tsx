"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import type { Notification as PrismaNotification } from '@prisma/client'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
import { NotificationSoundService } from '@/lib/services/notification-sound'

const PAGE_SIZE = 20

type ClientNotification = Omit<PrismaNotification, 'createdAt' | 'updatedAt' | 'readAt' | 'dismissedAt'> & {
  createdAt: string
  updatedAt: string
  readAt?: string | null
  dismissedAt?: string | null
}

interface NotificationContextValue {
  notifications: ClientNotification[]
  unreadCount: number
  isLoading: boolean
  isFetchingMore: boolean
  hasMore: boolean
  refreshNotifications: () => Promise<void>
  fetchMoreNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissNotification: (notificationId: string) => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

function toClientNotification(notification: PrismaNotification): ClientNotification {
  const toISOString = (value?: Date | string | null) => {
    if (!value) return null
    if (value instanceof Date) return value.toISOString()
    return value
  }

  return {
    ...notification,
    createdAt: toISOString(notification.createdAt) ?? new Date().toISOString(),
    updatedAt: toISOString(notification.updatedAt) ?? new Date().toISOString(),
    readAt: toISOString(notification.readAt),
    dismissedAt: toISOString(notification.dismissedAt)
  }
}

function dedupeNotifications(notifications: ClientNotification[]) {
  const seen = new Set<string>()
  const result: ClientNotification[] = []

  for (const notification of notifications) {
    if (seen.has(notification.id)) continue
    seen.add(notification.id)
    result.push(notification)
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const sseRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)

  const resetState = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    setHasMore(true)
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (!response.ok) return
      const data = await response.json()
      if (data.success) {
        setUnreadCount(data.data.count)
      }
    } catch (error) {
      logger.warn('Failed to fetch unread count', error)
    }
  }, [])

  const fetchNotifications = useCallback(
    async (reset = false) => {
      if (!isSignedIn) return

      try {
        if (reset) {
          setIsLoading(true)
        } else {
          setIsFetchingMore(true)
        }

        const offset = reset ? 0 : notifications.length
        const params = new URLSearchParams({
          limit: PAGE_SIZE.toString(),
          offset: offset.toString()
        })
        const response = await fetch(`/api/notifications?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }

        const data = await response.json()
        if (!data.success) return

        const incoming = (data.data.notifications as PrismaNotification[]).map(toClientNotification)
        setNotifications(prev => {
          const base = reset ? incoming : [...prev, ...incoming]
          return dedupeNotifications(base)
        })
        setHasMore(Boolean(data.data.hasMore))
      } catch (error) {
        logger.error('Failed to fetch notifications', error)
      } finally {
        setIsLoading(false)
        setIsFetchingMore(false)
      }
    },
    [isSignedIn, notifications.length]
  )

  const bootstrap = useCallback(async () => {
    await Promise.all([fetchNotifications(true), fetchUnreadCount()])
  }, [fetchNotifications, fetchUnreadCount])

  const handleCreatedEvent = useCallback((notification: PrismaNotification) => {
    const clientNotification = toClientNotification(notification)
    setNotifications(prev => dedupeNotifications([clientNotification, ...prev]).slice(0, 100))
    if (!clientNotification.isRead) {
      setUnreadCount(prev => prev + 1)
    }

    NotificationSoundService.init()
    NotificationSoundService.playSound('system')

    // Show toast when panel closed
    toast.info(clientNotification.title, {
      description: clientNotification.message
    })
  }, [])

  const handleUpdatedEvent = useCallback((notificationId: string, changes: Partial<PrismaNotification>) => {
    setNotifications(prev =>
      prev.map(notification => {
        if (notification.id !== notificationId) {
          return notification
        }

        const updated: ClientNotification = {
          ...notification,
          ...changes,
          createdAt: changes.createdAt ? toClientNotification(changes as PrismaNotification).createdAt : notification.createdAt,
          readAt: changes.readAt ? toClientNotification(changes as PrismaNotification).readAt : notification.readAt,
          dismissedAt: changes.dismissedAt
            ? toClientNotification(changes as PrismaNotification).dismissedAt
            : notification.dismissedAt
        }

        return updated
      })
    )

    if (changes.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [])

  const handleDeletedEvent = useCallback((notificationId: string) => {
    let removedUnread = false
    setNotifications(prev =>
      prev.filter(notification => {
        if (notification.id === notificationId) {
          if (!notification.isRead) {
            removedUnread = true
          }
          return false
        }
        return true
      })
    )
    if (removedUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [])

  const handleBulkReadEvent = useCallback((notificationIds: string[]) => {
    if (!notificationIds.length) return
    let changed = 0
    setNotifications(prev =>
      prev.map(notification => {
        if (notificationIds.includes(notification.id) && !notification.isRead) {
          changed += 1
          return {
            ...notification,
            isRead: true,
            readAt: notification.readAt ?? new Date().toISOString()
          }
        }
        return notification
      })
    )
    if (changed) {
      setUnreadCount(prev => Math.max(0, prev - changed))
    }
  }, [])

  const connectSse = useCallback(() => {
    if (!isSignedIn || typeof window === 'undefined') {
      return
    }

    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }

    try {
      const source = new EventSource('/api/notifications/stream')
      sseRef.current = source

      source.addEventListener('notification', event => {
        if (!event.data) return
        try {
          const payload = JSON.parse(event.data)
          switch (payload.type) {
            case 'created':
              handleCreatedEvent(payload.notification)
              break
            case 'updated':
              handleUpdatedEvent(payload.notificationId, payload.changes)
              break
            case 'deleted':
              handleDeletedEvent(payload.notificationId)
              break
            case 'bulk-read':
              handleBulkReadEvent(payload.notificationIds)
              break
            default:
              break
          }
        } catch (error) {
          logger.warn('Failed to process notification event', error)
        }
      })

      source.onerror = () => {
        source.close()
        sseRef.current = null
        if (!reconnectTimer.current) {
          reconnectTimer.current = setTimeout(() => {
            reconnectTimer.current = null
            connectSse()
          }, 5000)
        }
      }
    } catch (error) {
      logger.error('Failed to open notification stream', error)
    }
  }, [handleBulkReadEvent, handleCreatedEvent, handleDeletedEvent, handleUpdatedEvent, isSignedIn])

  useEffect(() => {
    if (!isSignedIn) {
      resetState()
      return
    }

    bootstrap()
    connectSse()

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount()
      }
    }

    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      document.removeEventListener('visibilitychange', visibilityHandler)
      resetState()
    }
  }, [bootstrap, connectSse, fetchUnreadCount, isSignedIn, resetState])

  const markAsRead = useCallback(
    async (notificationId: string) => {
    let decremented = false
    setNotifications(prev =>
      prev.map(notification => {
        if (notification.id === notificationId && !notification.isRead) {
          decremented = true
          return { ...notification, isRead: true, readAt: notification.readAt ?? new Date().toISOString() }
        }
        return notification
      })
    )
    if (decremented) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isRead: true })
        })
      } catch (error) {
        logger.error('Failed to mark notification as read', error)
        await fetchUnreadCount()
      }
    },
    [fetchUnreadCount]
  )

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev =>
      prev.map(notification => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt ?? new Date().toISOString()
      }))
    )
    setUnreadCount(0)

    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error)
      await bootstrap()
    }
  }, [bootstrap])

  const dismissNotification = useCallback(
    async (notificationId: string) => {
    let removedUnread = false
    setNotifications(prev =>
      prev.filter(notification => {
        if (notification.id === notificationId) {
          if (!notification.isRead) {
            removedUnread = true
          }
          return false
        }
        return true
      })
    )
    if (removedUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isDismissed: true })
        })
      } catch (error) {
        logger.error('Failed to dismiss notification', error)
        await bootstrap()
      }
    },
    [bootstrap]
  )

  const deleteNotification = useCallback(
    async (notificationId: string) => {
    let removedUnread = false
    setNotifications(prev =>
      prev.filter(notification => {
        if (notification.id === notificationId) {
          if (!notification.isRead) {
            removedUnread = true
          }
          return false
        }
        return true
      })
    )
    if (removedUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: 'DELETE'
        })
      } catch (error) {
        logger.error('Failed to delete notification', error)
        await bootstrap()
      }
    },
    [bootstrap]
  )

  const refreshNotifications = useCallback(() => fetchNotifications(true), [fetchNotifications])
  const fetchMoreNotifications = useCallback(() => fetchNotifications(false), [fetchNotifications])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isFetchingMore,
      hasMore,
      refreshNotifications,
      fetchMoreNotifications,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      deleteNotification
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      isFetchingMore,
      hasMore,
      refreshNotifications,
      fetchMoreNotifications,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      deleteNotification
    ]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }

  return context
}

