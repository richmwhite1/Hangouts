import { useState } from 'react'

interface UploadedImage {
  url: string
  jpegUrl: string
  filename: string
  size: number
  sizeKB: number
}

interface UseImageUploadReturn {
  uploadImage: (file: File) => Promise<UploadedImage | null>
  isUploading: boolean
  uploadError: string | null
  clearError: () => void
}

export const useImageUpload = (): UseImageUploadReturn => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadImage = async (file: File): Promise<UploadedImage | null> => {
    try {
      setIsUploading(true)
      setUploadError(null)

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('File size must be less than 10MB')
      }

      // Create form data
      const formData = new FormData()
      formData.append('image', file)

      // Upload image
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      return result.image

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadError(errorMessage)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const clearError = () => {
    setUploadError(null)
  }

  return {
    uploadImage,
    isUploading,
    uploadError,
    clearError,
  }
}

