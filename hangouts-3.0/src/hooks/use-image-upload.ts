import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'

import { logger } from '@/lib/logger'
interface UploadResult {
  url: string
  filename: string
  type: 'profile' | 'background' | 'hangout'
  size: number
  dimensions: { width: number; height: number }
  originalSize: number
  compressionRatio: number
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Safely call useAuth with error handling
  let clerkAuth
  try {
    clerkAuth = useAuth()
  } catch (error) {
    // Clerk not available, return empty state
    return {
      isUploading: false,
      error: 'Authentication not available',
      uploadImage: () => Promise.resolve(null),
      updateProfileImage: () => Promise.resolve(false)
    }
  }

  const { getToken } = clerkAuth

  const uploadImage = async (file: File, type: 'profile' | 'background' | 'hangout', hangoutId?: string): Promise<UploadResult | null> => {
    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      // Add hangoutId for hangout photos
      if (type === 'hangout' && hangoutId) {
        formData.append('hangoutId', hangoutId)
      }

      const token = await getToken()
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || 'Upload failed'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // Handle both response structures: { data: { url } } or { url, data: { url } }
      if (result.data && result.data.url) {
        return result.data
      } else if (result.url) {
        // Fallback: if data is missing but url exists at top level
        return {
          url: result.url,
          filename: result.filename || '',
          type: type,
          size: result.size || 0,
          dimensions: result.dimensions || { width: 0, height: 0 },
          originalSize: result.originalSize || 0,
          compressionRatio: result.compressionRatio || 0
        }
      }
      
      logger.error('Upload response missing expected structure:', result)
      throw new Error('Invalid upload response format')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      logger.error('Upload error:', err);
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const updateProfile = async (updates: {
    avatar?: string
    backgroundImage?: string
    bio?: string
    location?: string
    name?: string
    zodiac?: string
    enneagram?: string
    bigFive?: string
    loveLanguage?: string
    favoriteActivities?: string[]
    favoritePlaces?: string[]
  }) => {
    try {
      setIsUploading(true)
      setError(null)

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || 'Profile update failed'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result.data.user

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Profile update failed'
      setError(errorMessage)
      logger.error('Profile update error:', err);
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadImage,
    updateProfile,
    isUploading,
    error,
    clearError: () => setError(null)
  }
}