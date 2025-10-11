import { useState, useEffect, useCallback } from 'react'
import { useAuth } from "@clerk/nextjs"
import { logger } from '@/lib/logger'
interface UnreadCount {
  conversationId: string
  unreadCount: number
}
interface UnreadCountsData {
  unreadCounts: UnreadCount[]
  totalUnreadCount: number
}
export function useUnreadCounts() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([])
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const fetchUnreadCounts = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setUnreadCounts([])
      setTotalUnreadCount(0)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/conversations/unread-counts')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.success) {
        setUnreadCounts(data.data.unreadCounts)
        setTotalUnreadCount(data.data.totalUnreadCount)
      } else {
        throw new Error(data.error || 'Failed to fetch unread counts')
      }
    } catch (err) {
      logger.error('Error fetching unread counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch unread counts')
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn])
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, { method: 'POST' })
      if (response.ok) {
        // Update local state immediately
        setUnreadCounts(prev =>
          prev.map(conv =>
            conv.conversationId === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        )
        // Recalculate total
        setUnreadCounts(prev => {
          const newCounts = prev.map(conv =>
            conv.conversationId === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
          setTotalUnreadCount(newCounts.reduce((sum, conv) => sum + conv.unreadCount, 0))
          return newCounts
        })
      }
    } catch (err) {
      logger.error('Error marking conversation as read:', err);
    }
  }, [])
  const getUnreadCount = useCallback((conversationId: string) => {
    const conversation = unreadCounts.find(conv => conv.conversationId === conversationId)
    return conversation?.unreadCount || 0
  }, [unreadCounts])
  // Fetch unread counts on mount and when authentication changes
  useEffect(() => {
    fetchUnreadCounts()
  }, [fetchUnreadCounts])
  return {
    unreadCounts,
    totalUnreadCount,
    isLoading,
    error,
    fetchUnreadCounts,
    markConversationAsRead,
    getUnreadCount
  }
}