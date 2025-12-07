import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

interface UnreadActivity {
  hangoutId: string
  newMessagesCount: number
  newPhotosCount: number
  newCommentsCount: number
  lastViewedAt: string | null
  lastActivityAt: string | null
}

interface UnreadActivityMap {
  [hangoutId: string]: UnreadActivity
}

export function useUnreadActivity() {
  const { getToken } = useAuth()
  const [unreadActivity, setUnreadActivity] = useState<UnreadActivityMap>({})
  const [isLoading, setIsLoading] = useState(false)

  const fetchUnreadActivity = async (hangoutIds: string[]) => {
    if (hangoutIds.length === 0) return

    try {
      setIsLoading(true)
      const token = await getToken()
      
      const response = await fetch(`/api/hangouts/unread-activity?ids=${hangoutIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const activityMap: UnreadActivityMap = {}
          data.data.forEach((activity: UnreadActivity) => {
            activityMap[activity.hangoutId] = activity
          })
          setUnreadActivity(prev => ({ ...prev, ...activityMap }))
        }
      }
    } catch (error) {
      console.error('Error fetching unread activity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsViewed = async (hangoutId: string) => {
    try {
      const token = await getToken()
      
      const response = await fetch(`/api/hangouts/${hangoutId}/mark-viewed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Clear unread activity for this hangout
        setUnreadActivity(prev => {
          const updated = { ...prev }
          if (updated[hangoutId]) {
            updated[hangoutId] = {
              ...updated[hangoutId],
              newMessagesCount: 0,
              newPhotosCount: 0,
              newCommentsCount: 0,
              lastViewedAt: new Date().toISOString()
            }
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Error marking hangout as viewed:', error)
    }
  }

  const getActivityForHangout = (hangoutId: string): UnreadActivity | null => {
    return unreadActivity[hangoutId] || null
  }

  const hasUnreadActivity = (hangoutId: string): boolean => {
    const activity = unreadActivity[hangoutId]
    if (!activity) return false
    
    return activity.newMessagesCount > 0 || 
           activity.newPhotosCount > 0 || 
           activity.newCommentsCount > 0
  }

  return {
    unreadActivity,
    isLoading,
    fetchUnreadActivity,
    markAsViewed,
    getActivityForHangout,
    hasUnreadActivity
  }
}

