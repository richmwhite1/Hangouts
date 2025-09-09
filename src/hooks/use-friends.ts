"use client"

import { useState, useEffect } from 'react'
import { apiClient, User } from '@/lib/api-client'

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
  const [friends, setFriends] = useState<User[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check if user is authenticated before making requests
      if (!apiClient.isAuthenticated()) {
        setFriends([])
        setSentRequests([])
        setReceivedRequests([])
        setIsLoading(false)
        return
      }
      
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
  }, [])

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
