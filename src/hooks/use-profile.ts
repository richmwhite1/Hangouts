import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface UserProfile {
  id: string
  name: string
  username: string
  avatar: string | null
  bio?: string
  location?: string
  joinDate: string
  stats: {
    hangoutsHosted: number
    hangoutsAttended: number
    friends: number
    groups: number
  }
}

interface UserHangout {
  id: string
  title: string
  location: string
  startTime: string
  endTime: string
  status: string
  participants: number
  creatorId: string
  privacyLevel: string
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userHangouts, setUserHangouts] = useState<UserHangout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // For now, always show sign-in message since authentication is not implemented
    setIsLoading(false)
    setError('Authentication required')
  }, [])

  return {
    profile,
    userHangouts,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true)
      // Re-trigger the useEffect
      setProfile(null)
      setUserHangouts([])
    }
  }
}
