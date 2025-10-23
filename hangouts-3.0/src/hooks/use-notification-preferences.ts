import { useState, useEffect, useCallback } from 'react'
import { useAuth } from "@clerk/nextjs"
import { logger } from '@/lib/logger'

interface NotificationPreference {
  type: string
  emailEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
}

interface NotificationPreferences {
  [key: string]: {
    emailEnabled: boolean
    pushEnabled: boolean
    inAppEnabled: boolean
  }
}
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Safely call useAuth with error handling
  let clerkAuth
  try {
    clerkAuth = useAuth()
  } catch (error) {
    // Clerk not available, return empty state
    return {
      preferences: null,
      isLoading: false,
      isSaving: false,
      error: 'Authentication not available',
      fetchPreferences: () => {},
      updatePreferences: () => Promise.resolve(false),
      togglePreference: () => Promise.resolve(false),
      resetToDefaults: () => Promise.resolve(false)
    }
  }
  
  const { isSignedIn, isLoaded, getToken } = clerkAuth
  const fetchPreferences = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setPreferences(null)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/notifications/preferences')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.success) {
        // Convert array of preferences to object keyed by type
        const preferencesMap: NotificationPreferences = {}
        data.data.forEach((pref: NotificationPreference) => {
          preferencesMap[pref.type] = {
            emailEnabled: pref.emailEnabled,
            pushEnabled: pref.pushEnabled,
            inAppEnabled: pref.inAppEnabled
          }
        })
        setPreferences(preferencesMap)
      } else {
        throw new Error(data.error || 'Failed to fetch preferences')
      }
    } catch (err) {
      logger.error('Error fetching notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences')
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn])
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return false
    try {
      setIsSaving(true)
      setError(null)
      
      // Convert updates to array format for API
      const preferencesArray = Object.entries(updates).map(([type, settings]) => ({
        type,
        ...settings
      }))
      
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences: preferencesArray })
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.success) {
        // Update local state with the changes
        setPreferences(prev => ({
          ...prev,
          ...updates
        }))
        return true
      } else {
        throw new Error(data.error || 'Failed to update preferences')
      }
    } catch (err) {
      logger.error('Error updating notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [preferences])
  const togglePreference = useCallback(async (type: string, setting: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled') => {
    if (!preferences || !preferences[type]) return false
    const newValue = !preferences[type][setting]
    const updates = {
      [type]: {
        ...preferences[type],
        [setting]: newValue
      }
    }
    return await updatePreferences(updates)
  }, [preferences, updatePreferences])
  
  const resetToDefaults = useCallback(async () => {
    const defaultPreferences = {
      FRIEND_REQUEST: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      FRIEND_ACCEPTED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      MESSAGE_RECEIVED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      CONTENT_INVITATION: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      CONTENT_RSVP: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      CONTENT_REMINDER: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      CONTENT_UPDATE: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
      COMMUNITY_INVITATION: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      MENTION: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      LIKE: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
      COMMENT: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      SHARE: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
      POLL_VOTE_CAST: { emailEnabled: false, pushEnabled: false, inAppEnabled: true },
      POLL_CONSENSUS_REACHED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      HANGOUT_CONFIRMED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true },
      HANGOUT_CANCELLED: { emailEnabled: false, pushEnabled: true, inAppEnabled: true }
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