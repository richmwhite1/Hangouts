import { useState, useEffect } from 'react'
import { clerkApiClient } from '@/lib/clerk-api-client'
import { useAuth, useUser } from '@clerk/nextjs'

interface UserProfile {
  id: string
  name: string
  username: string
  avatar: string | null
  backgroundImage: string | null
  bio?: string
  location?: string
  zodiac?: string
  enneagram?: string
  bigFive?: string
  loveLanguage?: string
  favoriteActivities?: string[]
  favoritePlaces?: string[]
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
  image?: string
  participants: Array<{
    id: string
    hangoutId: string
    userId: string
    role: string
    rsvpStatus: string
    canEdit: boolean
    invitedAt: string
    respondedAt: string | null
    joinedAt: string | null
    user: {
      id: string
      username: string
      name: string
      avatar: string | null
      lastSeen: string
      isActive: boolean
    }
  }>
  creatorId: string
  privacyLevel: string
  _count?: {
    participants: number
    tasks: number
    polls: number
    messages: number
  }
}

export function useProfile() {
  const { isSignedIn, isLoaded: authLoading, getToken } = useAuth()
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userHangouts, setUserHangouts] = useState<UserHangout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      // Don't fetch if auth is still loading or user is not authenticated
      if (authLoading || !isSignedIn || !user) {
        setIsLoading(authLoading)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Get username from Clerk user (use email as fallback if no username)
        const username = user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'user'
        
        // Fetch full profile data using the Clerk API client
        const data = await clerkApiClient.getProfile(username, getToken)
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch profile')
        }
        
        // Use the profile data from the API
        const userProfile: UserProfile = {
          id: data.data.profile.id,
          name: data.data.profile.name,
          username: data.data.profile.username,
          avatar: data.data.profile.avatar,
          backgroundImage: data.data.profile.backgroundImage,
          bio: data.data.profile.bio || '',
          location: data.data.profile.location || '',
          zodiac: data.data.profile.zodiac,
          enneagram: data.data.profile.enneagram,
          bigFive: data.data.profile.bigFive,
          loveLanguage: data.data.profile.loveLanguage,
          joinDate: data.data.profile.joinDate,
          stats: data.data.profile.stats
        }
        
        setProfile(userProfile)
        setUserHangouts(data.data.hangouts || [])
        
      } catch (error) {
        console.error('Profile fetch error:', error)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [isSignedIn, authLoading, getToken, user])

  const refetch = async () => {
    // Don't refetch if user is not authenticated
    if (!isSignedIn || !user) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Get username from Clerk user (use email as fallback if no username)
      const username = user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'user'
      
      // Fetch full profile data using the Clerk API client
      const data = await clerkApiClient.getProfile(username, getToken)
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch profile')
      }
      
      // Use the profile data from the API
      const userProfile: UserProfile = {
        id: data.data.profile.id,
        name: data.data.profile.name,
        username: data.data.profile.username,
        avatar: data.data.profile.avatar,
        backgroundImage: data.data.profile.backgroundImage,
        bio: data.data.profile.bio || '',
        location: data.data.profile.location || '',
        zodiac: data.data.profile.zodiac,
        enneagram: data.data.profile.enneagram,
        bigFive: data.data.profile.bigFive,
        loveLanguage: data.data.profile.loveLanguage,
        joinDate: data.data.profile.joinDate,
        stats: data.data.profile.stats
      }
      
      setProfile(userProfile)
      setUserHangouts(data.data.hangouts || [])
      
    } catch (error) {
      console.error('Profile refetch error:', error)
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      if (data.success) {
        // Update local state with the new profile data
        setProfile(prev => prev ? { ...prev, ...profileData } : null)
        return data.data.user
      } else {
        throw new Error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  return {
    profile,
    userHangouts,
    isLoading,
    error,
    refetch,
    updateProfile
  }
}
