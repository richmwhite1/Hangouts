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
      logger.info(`Marking conversation ${conversationId} as read`)
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const responseData = await response.json().catch(() => null)
        const serverUnreadCount = responseData?.data?.unreadCount ?? 0
        
        logger.info(`Mark-read response for ${conversationId}: unreadCount=${serverUnreadCount}`, responseData)
        
        // Update local state immediately for instant UI feedback
        setUnreadCounts(prev => {
          const oldTotal = prev.reduce((sum, conv) => sum + conv.unreadCount, 0)
          const newCounts = prev.map(conv =>
            conv.conversationId === conversationId
              ? { ...conv, unreadCount: serverUnreadCount }
              : conv
          )
          // If conversation not in list, add it
          if (!newCounts.find(c => c.conversationId === conversationId)) {
            newCounts.push({ conversationId, unreadCount: serverUnreadCount })
          }
          // Recalculate total immediately
          const newTotal = newCounts.reduce((sum, conv) => sum + conv.unreadCount, 0)
          setTotalUnreadCount(newTotal)
          logger.info(`Unread count updated: ${oldTotal} -> ${newTotal} for conversation ${conversationId}`)
          return newCounts
        })
        
        // Refresh unread counts from server to ensure accuracy (will override if different)
        // Use a small delay to ensure database transaction is committed
        setTimeout(async () => {
          await fetchUnreadCounts()
          logger.info(`Refreshed unread counts from server after marking ${conversationId} as read`)
        }, 500)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        logger.error(`Failed to mark conversation ${conversationId} as read:`, errorData)
        // Still refresh to get accurate state
        await fetchUnreadCounts()
      }
    } catch (err) {
      logger.error(`Error marking conversation ${conversationId} as read:`, err);
      // Still refresh to get accurate state
      await fetchUnreadCounts()
    }
  }, [fetchUnreadCounts])
  const getUnreadCount = useCallback((conversationId: string) => {
    const conversation = unreadCounts.find(conv => conv.conversationId === conversationId)
    return conversation?.unreadCount || 0
  }, [unreadCounts])
  // Fetch unread counts on mount and when authentication changes
  useEffect(() => {
    fetchUnreadCounts()
    
    // Set up periodic refresh every 30 seconds to keep counts accurate
    const interval = setInterval(() => {
      if (isLoaded && isSignedIn) {
        fetchUnreadCounts()
      }
    }, 30000) // Refresh every 30 seconds
    
    // Also refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLoaded && isSignedIn) {
        fetchUnreadCounts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchUnreadCounts, isLoaded, isSignedIn])
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