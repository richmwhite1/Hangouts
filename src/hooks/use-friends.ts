"use client"

import { useState, useEffect } from 'react'
import { User } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

interface FriendRequest {
  id: string
  senderId: string
  receiverId: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  message?: string
  createdAt: string
  sender: User
  receiver: User
}

interface UseFriendsReturn {
  friends: User[]
  sentRequests: FriendRequest[]
  receivedRequests: FriendRequest[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  sendFriendRequest: (userId: string, message?: string) => Promise<void>
  respondToFriendRequest: (requestId: string, status: 'ACCEPTED' | 'DECLINED') => Promise<void>
}

export const useFriends = (): UseFriendsReturn => {
  const { isSignedIn, isLoaded: authLoading, getToken } = useAuth()
  const [friends, setFriends] = useState<User[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isSignedIn) {
      setFriends([])
      setSentRequests([])
      setReceivedRequests([])
      setIsLoading(authLoading)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const token = await getToken()
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      const [friendsResponse, requestsResponse] = await Promise.all([
        fetch('/api/friends', { headers }),
        fetch('/api/friends/requests', { headers })
      ])
      
      if (!friendsResponse.ok || !requestsResponse.ok) {
        throw new Error('Failed to fetch friends data')
      }
      
      const friendsData = await friendsResponse.json()
      const requestsData = await requestsResponse.json()
      
      setFriends(friendsData.data?.friends || [])
      setSentRequests(requestsData.data?.requests?.sent || [])
      setReceivedRequests(requestsData.data?.requests?.received || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch friends data'
      setError(errorMessage)
      console.error('Error fetching friends data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const sendFriendRequest = async (userId: string, message?: string) => {
    try {
      const token = await getToken()
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverId: userId, message })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send friend request')
      }
      await fetchData() // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send friend request'
      
      // If it's an "already exists" error, refresh data anyway to show correct status
      if (err instanceof Error && errorMessage.includes('already exists')) {
        await fetchData() // Refresh data to show correct status
        return // Don't throw error, just return
      }
      
      setError(errorMessage)
      throw err
    }
  }

  const respondToFriendRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const token = await getToken()
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, status })
      })
      
      if (!response.ok) {
        throw new Error('Failed to respond to friend request')
      }
      await fetchData() // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to friend request'
      setError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    fetchData()
  }, [isSignedIn, authLoading, getToken])

  return {
    friends,
    sentRequests,
    receivedRequests,
    isLoading,
    error,
    refetch: fetchData,
    sendFriendRequest,
    respondToFriendRequest,
  }
}
