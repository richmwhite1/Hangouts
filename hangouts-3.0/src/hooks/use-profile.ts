import { useState, useEffect } from 'react'
// Removed api-client import - using direct fetch calls
import { useAuth } from '@clerk/nextjs'

import { logger } from '@/lib/logger'
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
  // Safely call useAuth with error handling
  let clerkAuth
  try {
    clerkAuth = useAuth()
  } catch (error) {
    // Clerk not available, return empty state
    return {
      profile: null,
      userHangouts: [],
      isLoading: false,
      error: 'Authentication not available',
      refetch: () => Promise.resolve(),
      updateProfile: () => Promise.resolve(false)
    }
  }

  const { isSignedIn, isLoaded, getToken } = clerkAuth
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userHangouts, setUserHangouts] = useState<UserHangout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      // Don't fetch if auth is still loading or user is not authenticated
      if (!isLoaded || !isSignedIn) {
        setIsLoading(!isLoaded)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Get current user to get username
        const userResponse = await fetch('/api/auth/me')
        if (!userResponse.ok) {
          throw new Error('Failed to get current user')
        }
        const { data: userData } = await userResponse.json()
        console.log('🔍 use-profile - userData:', userData)
        const user = userData
        
        if (!user || !user.username) {
          console.error('🔍 use-profile - Invalid user data:', user)
          throw new Error('Invalid user data - missing username')
        }
        
        // Fetch full profile data using the profile API
        const profileResponse = await fetch(`/api/profile?username=${user.username}`)
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile')
        }
        
        const data = await profileResponse.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch profile')
        }
        
        // Parse favorite activities and places from JSON strings
        let favoriteActivities: string[] = []
        let favoritePlaces: string[] = []
        
        try {
          if (data.data.profile.favoriteActivities) {
            favoriteActivities = typeof data.data.profile.favoriteActivities === 'string' 
              ? JSON.parse(data.data.profile.favoriteActivities) 
              : data.data.profile.favoriteActivities
          }
        } catch (e) {
          logger.warn('Failed to parse favoriteActivities:', e);
        }
        
        try {
          if (data.data.profile.favoritePlaces) {
            favoritePlaces = typeof data.data.profile.favoritePlaces === 'string' 
              ? JSON.parse(data.data.profile.favoritePlaces) 
              : data.data.profile.favoritePlaces
          }
        } catch (e) {
          logger.warn('Failed to parse favoritePlaces:', e);
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
          favoriteActivities: favoriteActivities,
          favoritePlaces: favoritePlaces,
          joinDate: data.data.profile.joinDate,
          stats: data.data.profile.stats
        }
        
        setProfile(userProfile)
        setUserHangouts(data.data.hangouts || [])
        
      } catch (error) {
        logger.error('Profile fetch error:', error);
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [isSignedIn, isLoaded])

  const refetch = async () => {
    // Don't refetch if user is not authenticated
    if (!isSignedIn) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Get current user to get username
      const userResponse = await fetch('/api/auth/me')
      if (!userResponse.ok) {
        throw new Error('Failed to get current user')
      }
      const { data: userData } = await userResponse.json()
      const user = userData
      
      // Check if user and username exist
      if (!user || !user.username) {
        console.error('🔍 refetch - Invalid user data:', user)
        throw new Error('User data is incomplete - missing username')
      }
      
      console.log('🔍 refetch - Fetching profile for username:', user.username)
      
      // Fetch full profile data using the profile API
      const profileResponse = await fetch(`/api/profile?username=${user.username}`)
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const data = await profileResponse.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch profile')
      }
      
      // Parse favorite activities and places from JSON strings
      let favoriteActivities: string[] = []
      let favoritePlaces: string[] = []
      
      try {
        if (data.data.profile.favoriteActivities) {
          favoriteActivities = typeof data.data.profile.favoriteActivities === 'string' 
            ? JSON.parse(data.data.profile.favoriteActivities) 
            : data.data.profile.favoriteActivities
        }
      } catch (e) {
        logger.warn('Failed to parse favoriteActivities:', e);
      }
      
      try {
        if (data.data.profile.favoritePlaces) {
          favoritePlaces = typeof data.data.profile.favoritePlaces === 'string' 
            ? JSON.parse(data.data.profile.favoritePlaces) 
            : data.data.profile.favoritePlaces
        }
      } catch (e) {
        logger.warn('Failed to parse favoritePlaces:', e);
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
        favoriteActivities: favoriteActivities,
        favoritePlaces: favoritePlaces,
        joinDate: data.data.profile.joinDate,
        stats: data.data.profile.stats
      }
      
      setProfile(userProfile)
      setUserHangouts(data.data.hangouts || [])
      
    } catch (error) {
      logger.error('Profile refetch error:', error);
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const token = await getToken()
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
      logger.error('Profile update error:', error)
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
