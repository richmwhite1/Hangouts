"use client"

import { useState, useEffect, useCallback } from 'react'
import { Content as Hangout } from '@/types/api'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
interface UseHangoutsParams {
  status?: string
  privacy?: string
  limit?: number
  offset?: number
}

interface UseHangoutsReturn {
  hangouts: Hangout[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useHangouts = (params?: UseHangoutsParams): UseHangoutsReturn => {
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHangouts = useCallback(async () => {
    try {
      // console.log('🚀 Starting to fetch hangouts...'); // Removed for production
      setIsLoading(true)
      setError(null)

      const data = await apiClient.getHangouts(params)
      // console.log('✅ Fetched hangouts:', data.hangouts.length); // Removed for production
      setHangouts(data.hangouts)
    } catch (err) {
      logger.error('❌ Error fetching hangouts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hangouts'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // console.log('🎯 useEffect running on client side'); // Removed for production
    fetchHangouts()
  }, [fetchHangouts])

  return {
    hangouts,
    isLoading,
    error,
    refetch: fetchHangouts
  }
}

export const useHangout = (id: string) => {
  const [hangout, setHangout] = useState<Hangout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHangout = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiClient.getHangout(id)
      setHangout(data.hangout)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hangout'
      setError(errorMessage)
      logger.error('Error fetching hangout:', err);
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchHangout()
    }
  }, [id, fetchHangout])

  return {
    hangout,
    isLoading,
    error,
    refetch: fetchHangout
  }
}
