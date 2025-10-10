import { useState, useEffect } from 'react'
// Removed api-client import - using direct fetch calls
import { useAuth } from '@/contexts/auth-context'

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
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userHangouts, setUserHangouts] = useState<UserHangout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      // Don't fetch if auth is still loading or user is not authenticated
      if (authLoading || !isAuthenticated) {
        setIsLoading(authLoading)
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
        const user = userData.user
        
        // Fetch full profile data using the profile API
        const profileResponse = await fetch(`/api/profile?username=${user.username}`)
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile')
        }
        
        const data = await profileResponse.json()
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
  }, [isAuthenticated, authLoading])

  const refetch = async () => {
    // Don't refetch if user is not authenticated
    if (!isAuthenticated) {
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
      const user = userData.user
      
      // Fetch full profile data using the profile API
      const profileResponse = await fetch(`/api/profile?username=${user.username}`)
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const data = await profileResponse.json()
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

  return {
    profile,
    userHangouts,
    isLoading,
    error,
    refetch
  }
}
