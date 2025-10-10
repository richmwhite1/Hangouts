import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface Reminder {
  id: string
  userId: string
  contentId?: string
  type: string
  title: string
  message: string
  scheduledFor: string
  isSent: boolean
  isDismissed: boolean
  sentAt?: string
  dismissedAt?: string
  createdAt: string
  content?: {
    id: string
    title: string
    type: string
    startTime?: string
    endTime?: string
    location?: string
  }
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, token } = useAuth()

  const fetchReminders = useCallback(async (upcoming = true) => {
    if (!isAuthenticated || !token) {
      setReminders([])
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (upcoming) {
        params.append('upcoming', 'true')
      }
      
      const response = await fetch(`/api/reminders?${params}`, {
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
        setReminders(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch reminders')
      }
    } catch (err) {
      console.error('Error fetching reminders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reminders')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, token])

  const createReminder = useCallback(async (reminderData: {
    contentId?: string
    type: string
    title: string
    message: string
    scheduledFor: string
  }) => {
    if (!token) return null

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reminderData)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setReminders(prev => [...prev, data.data])
        return data.data
      } else {
        throw new Error(data.error || 'Failed to create reminder')
      }
    } catch (err) {
      console.error('Error creating reminder:', err)
      setError(err instanceof Error ? err.message : 'Failed to create reminder')
      return null
    }
  }, [token])

  const dismissReminder = useCallback(async (reminderId: string) => {
    if (!token) return

    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDismissed: true })
      })

      if (response.ok) {
        setReminders(prev => prev.filter(r => r.id !== reminderId))
      }
    } catch (err) {
      console.error('Error dismissing reminder:', err)
    }
  }, [token])

  const getUpcomingReminders = useCallback(() => {
    const now = new Date()
    return reminders.filter(reminder => {
      const scheduledFor = new Date(reminder.scheduledFor)
      return scheduledFor > now && !reminder.isSent && !reminder.isDismissed
    })
  }, [reminders])

  const getRemindersByType = useCallback((type: string) => {
    return reminders.filter(reminder => reminder.type === type)
  }, [reminders])

  // Fetch reminders on mount and when authentication changes
  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  return {
    reminders,
    isLoading,
    error,
    fetchReminders,
    createReminder,
    dismissReminder,
    getUpcomingReminders,
    getRemindersByType
  }
}
