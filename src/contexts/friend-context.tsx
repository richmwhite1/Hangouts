"use client"

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { apiClient, User, FriendRequest } from '@/lib/api-client'

interface FriendState {
  friends: User[]
  sentRequests: FriendRequest[]
  receivedRequests: FriendRequest[]
  isLoading: boolean
  error: string | null
}

type FriendAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FRIENDS'; payload: User[] }
  | { type: 'SET_SENT_REQUESTS'; payload: FriendRequest[] }
  | { type: 'SET_RECEIVED_REQUESTS'; payload: FriendRequest[] }
  | { type: 'ADD_FRIEND'; payload: User }
  | { type: 'REMOVE_FRIEND'; payload: string }
  | { type: 'ADD_SENT_REQUEST'; payload: FriendRequest }
  | { type: 'REMOVE_SENT_REQUEST'; payload: string }
  | { type: 'REMOVE_RECEIVED_REQUEST'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }

interface FriendContextType {
  state: FriendState
  fetchFriends: () => Promise<void>
  fetchFriendRequests: () => Promise<void>
  sendFriendRequest: (userId: string, message?: string) => Promise<void>
  respondToFriendRequest: (requestId: string, status: 'ACCEPTED' | 'DECLINED') => Promise<void>
  removeFriend: (userId: string) => Promise<void>
  clearError: () => void
}

const FriendContext = createContext<FriendContextType | undefined>(undefined)

const friendReducer = (state: FriendState, action: FriendAction): FriendState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_FRIENDS':
      return { ...state, friends: action.payload, error: null }
    case 'SET_SENT_REQUESTS':
      return { ...state, sentRequests: action.payload, error: null }
    case 'SET_RECEIVED_REQUESTS':
      return { ...state, receivedRequests: action.payload, error: null }
    case 'ADD_FRIEND':
      return { ...state, friends: [...state.friends, action.payload] }
    case 'REMOVE_FRIEND':
      return { ...state, friends: state.friends.filter(f => f.id !== action.payload) }
    case 'ADD_SENT_REQUEST':
      return { ...state, sentRequests: [...state.sentRequests, action.payload] }
    case 'REMOVE_SENT_REQUEST':
      return { ...state, sentRequests: state.sentRequests.filter(r => r.id !== action.payload) }
    case 'REMOVE_RECEIVED_REQUEST':
      return { ...state, receivedRequests: state.receivedRequests.filter(r => r.id !== action.payload) }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    default:
      return state
  }
}

const initialState: FriendState = {
  friends: [],
  sentRequests: [],
  receivedRequests: [],
  isLoading: false,
  error: null
}

interface FriendProviderProps {
  children: ReactNode
}

export const FriendProvider: React.FC<FriendProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(friendReducer, initialState)

  const fetchFriends = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiClient.getFriends()
      dispatch({ type: 'SET_FRIENDS', payload: data.friends })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch friends'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }, [])

  const fetchFriendRequests = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiClient.getFriendRequests()
      dispatch({ type: 'SET_SENT_REQUESTS', payload: data.sent })
      dispatch({ type: 'SET_RECEIVED_REQUESTS', payload: data.received })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch friend requests'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }, [])

  const sendFriendRequest = useCallback(async (userId: string, message?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await apiClient.sendFriendRequest(userId, message)
      dispatch({ type: 'ADD_SENT_REQUEST', payload: response.request })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [])

  const respondToFriendRequest = useCallback(async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await apiClient.respondToFriendRequest(requestId, status)
      
      if (status === 'ACCEPTED') {
        // Remove from received requests and add to friends
        dispatch({ type: 'REMOVE_RECEIVED_REQUEST', payload: requestId })
        // Note: We'd need to fetch the friend data here or get it from the response
        // For now, we'll refetch friends
        await fetchFriends()
      } else {
        dispatch({ type: 'REMOVE_RECEIVED_REQUEST', payload: requestId })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to respond to friend request'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [fetchFriends])

  const removeFriend = useCallback(async (userId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await apiClient.removeFriend(userId)
      dispatch({ type: 'REMOVE_FRIEND', payload: userId })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove friend'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  const value: FriendContextType = {
    state,
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    clearError,
  }

  return (
    <FriendContext.Provider value={value}>
      {children}
    </FriendContext.Provider>
  )
}

export const useFriends = () => {
  const context = useContext(FriendContext)
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendProvider')
  }
  return context
}













