"use client"

import { useState, useEffect } from 'react'
import { User } from '@/types/api'
import { useAuth } from '@/contexts/auth-context'

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
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [friends, setFriends] = useState<User[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      setFriends([])
      setSentRequests([])
      setReceivedRequests([])
      setIsLoading(authLoading)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const [friendsData, requestsData] = await Promise.all([
        apiClient.getFriends(),
        apiClient.getFriendRequests()
      ])
      
      setFriends(friendsData.friends)
      setSentRequests(requestsData.sent)
      setReceivedRequests(requestsData.received)
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
      await apiClient.sendFriendRequest(userId, message)
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
      await apiClient.respondToFriendRequest(requestId, status)
      await fetchData() // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to friend request'
      setError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    fetchData()
  }, [isAuthenticated, authLoading])

  return {
    friends,
    sentRequests,
    receivedRequests,
    isLoading,
    error,
    refetch: fetchData,
    sendFriendRequest,
    respondToFriendRequest}
}
