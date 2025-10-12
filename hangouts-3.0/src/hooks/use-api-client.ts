import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api-client'

export function useApiClient() {
  const { getToken, isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    const updateToken = async () => {
      if (isLoaded && isSignedIn) {
        try {
          const token = await getToken()
          apiClient.setToken(token)
        } catch (error) {
          console.error('Error getting token:', error)
          apiClient.setToken(null)
        }
      } else {
        apiClient.setToken(null)
      }
    }

    updateToken()
  }, [getToken, isSignedIn, isLoaded])

  return apiClient
}
