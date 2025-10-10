import { useState, useEffect, useCallback } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { apiClient } from '@/lib/api-client'

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
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  const fetchUnreadCounts = useCallback(async () => {
    if (!isSignedIn || !user) {
      setUnreadCounts([])
      setTotalUnreadCount(0)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const token = await getToken()
      const response = await fetch('/api/conversations/unread-counts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

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
      console.error('Error fetching unread counts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch unread counts')
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, user, getToken])

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!isSignedIn || !user) return

    try {
      const token = await getToken()
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

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
      console.error('Error marking conversation as read:', err)
    }
  }, [isSignedIn, user, getToken])

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
