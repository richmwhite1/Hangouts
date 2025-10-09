import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

interface NotificationPreferences {
  id: string
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  inAppNotifications: boolean
  messageNotifications: boolean
  hangoutNotifications: boolean
  eventNotifications: boolean
  reminderNotifications: boolean
  systemNotifications: boolean
  createdAt: string
  updatedAt: string
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isSignedIn, getToken } = useAuth()

  const fetchPreferences = useCallback(async () => {
    if (!isSignedIn) {
      setPreferences(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const token = await getToken()
      const response = await fetch('/api/notifications/preferences', {
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
        setPreferences(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch preferences')
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences')
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, getToken])

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!isSignedIn) return false

    try {
      setIsSaving(true)
      setError(null)
      
      const token = await getToken()
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.data)
        return true
      } else {
        throw new Error(data.error || 'Failed to update preferences')
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isSignedIn, getToken])

  const togglePreference = useCallback(async (key: keyof NotificationPreferences) => {
    if (!preferences) return false

    const newValue = !preferences[key]
    const updates = { [key]: newValue }
    
    return await updatePreferences(updates)
  }, [preferences, updatePreferences])

  const resetToDefaults = useCallback(async () => {
    const defaultPreferences = {
      emailNotifications: true,
      pushNotifications: false,
      inAppNotifications: true,
      messageNotifications: true,
      hangoutNotifications: true,
      eventNotifications: true,
      reminderNotifications: true,
      systemNotifications: true
    }
    
    return await updatePreferences(defaultPreferences)
  }, [updatePreferences])

  // Fetch preferences on mount and when authentication changes
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    isLoading,
    isSaving,
    error,
    fetchPreferences,
    updatePreferences,
    togglePreference,
    resetToDefaults
  }
}
