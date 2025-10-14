"use client"

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { Content as Hangout } from '@/types/api'

interface HangoutState {
  hangouts: Hangout[]
  currentHangout: Hangout | null
  isLoading: boolean
  error: string | null
  filters: {
    status?: string
    privacy?: string
    location?: string
    startDate?: string
    endDate?: string
  }
}

type HangoutAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_HANGOUTS'; payload: Hangout[] }
  | { type: 'SET_CURRENT_HANGOUT'; payload: Hangout | null }
  | { type: 'ADD_HANGOUT'; payload: Hangout }
  | { type: 'UPDATE_HANGOUT'; payload: Hangout }
  | { type: 'REMOVE_HANGOUT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<HangoutState['filters']> }
  | { type: 'CLEAR_FILTERS' }

interface HangoutContextType {
  state: HangoutState
  fetchHangouts: (params?: Record<string, unknown>) => Promise<void>
  fetchHangout: (id: string) => Promise<void>
  createHangout: (data: Record<string, unknown>) => Promise<Hangout>
  updateHangout: (id: string, data: Record<string, unknown>) => Promise<Hangout>
  deleteHangout: (id: string) => Promise<void>
  setFilters: (filters: Partial<HangoutState['filters']>) => void
  clearFilters: () => void
  clearError: () => void
}

const HangoutContext = createContext<HangoutContextType | undefined>(undefined)

const hangoutReducer = (state: HangoutState, action: HangoutAction): HangoutState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_HANGOUTS':
      return { ...state, hangouts: action.payload, error: null }
    case 'SET_CURRENT_HANGOUT':
      return { ...state, currentHangout: action.payload }
    case 'ADD_HANGOUT':
      return { ...state, hangouts: [action.payload, ...state.hangouts] }
    case 'UPDATE_HANGOUT':
      return {
        ...state,
        hangouts: state.hangouts.map(h => h.id === action.payload.id ? action.payload : h),
        currentHangout: state.currentHangout?.id === action.payload.id ? action.payload : state.currentHangout
      }
    case 'REMOVE_HANGOUT':
      return {
        ...state,
        hangouts: state.hangouts.filter(h => h.id !== action.payload),
        currentHangout: state.currentHangout?.id === action.payload ? null : state.currentHangout
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'CLEAR_FILTERS':
      return { ...state, filters: {} }
    default:
      return state
  }
}

const initialState: HangoutState = {
  hangouts: [],
  currentHangout: null,
  isLoading: false,
  error: null,
  filters: {}
}

interface HangoutProviderProps {
  children: ReactNode
}

export const HangoutProvider: React.FC<HangoutProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(hangoutReducer, initialState)

  const fetchHangouts = useCallback(async (params?: Record<string, unknown>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiClient.getHangouts(params)
      dispatch({ type: 'SET_HANGOUTS', payload: data.hangouts })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hangouts'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }, [])

  const fetchHangout = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiClient.getHangout(id)
      dispatch({ type: 'SET_CURRENT_HANGOUT', payload: data.hangout })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hangout'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    }
  }, [])

  const createHangout = useCallback(async (data: Record<string, unknown>): Promise<Hangout> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await apiClient.createHangout(data)
      dispatch({ type: 'ADD_HANGOUT', payload: response.hangout })
      return response.hangout
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create hangout'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [])

  const updateHangout = useCallback(async (id: string, data: Record<string, unknown>): Promise<Hangout> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await apiClient.updateHangout(id, data)
      dispatch({ type: 'UPDATE_HANGOUT', payload: response.hangout })
      return response.hangout
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update hangout'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [])

  const deleteHangout = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await apiClient.deleteHangout(id)
      dispatch({ type: 'REMOVE_HANGOUT', payload: id })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete hangout'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [])

  const setFilters = useCallback((filters: Partial<HangoutState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [])

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  const value: HangoutContextType = {
    state,
    fetchHangouts,
    fetchHangout,
    createHangout,
    updateHangout,
    deleteHangout,
    setFilters,
    clearFilters,
    clearError}

  return (
    <HangoutContext.Provider value={value}>
      {children}
    </HangoutContext.Provider>
  )
}

export const useHangouts = () => {
  const context = useContext(HangoutContext)
  if (context === undefined) {
    throw new Error('useHangouts must be used within a HangoutProvider')
  }
  return context
}




























