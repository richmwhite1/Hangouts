import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { logger } from '@/lib/logger'
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
        )
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
      logger.error('Error fetching reminders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reminders')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])
  const createReminder = useCallback(async (reminderData: {
    contentId?: string
    type: string
    title: string
    message: string
    scheduledFor: string
  }) => {
    null
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
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
      logger.error('Error creating reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create reminder')
      return null
    }
  }, [])
  const dismissReminder = useCallback(async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDismissed: true })
      })
      if (response.ok) {
        setReminders(prev => prev.filter(r => r.id !== reminderId))
      }
    } catch (err) {
      logger.error('Error dismissing reminder:', err);
    }
  }, [])
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