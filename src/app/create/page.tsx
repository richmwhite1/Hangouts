'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export default function CreateHangoutPage() {
  const router = useRouter()
  const { isAuthenticated, user, token } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && (!isAuthenticated || !user || !token)) {
      router.push('/login')
    }
  }, [isClient, isAuthenticated, user, token, router])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || !token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const handleCreateHangout = async (formData: NewHangoutFormData) => {
    try {
      setIsCreating(true)

      // Validate required fields
      if (!formData.title.trim()) {
        toast.error('Title is required')
        return
      }

      let imageUrl = null

      // Upload image if provided
      if (formData.image) {
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('file', formData.image)
          uploadFormData.append('type', 'hangout')

          const token = localStorage.getItem('auth_token')
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: uploadFormData
          })

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            imageUrl = uploadData.url
            console.log('Image uploaded successfully:', imageUrl)
          } else {
            console.error('Image upload failed:', uploadResponse.status)
            toast.error('Failed to upload image')
            return
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          toast.error('Failed to upload image')
          return
        }
      }

      const hangoutData = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        privacyLevel: formData.privacyLevel,
        image: imageUrl,
        participants: formData.participants,
        type: formData.type,
        options: formData.options
          .filter(option => option.title.trim() !== '')
          .map(option => ({
            id: option.id,
            title: option.title,
            description: option.description || '',
            location: option.location || '',
            dateTime: option.dateTime || new Date().toISOString(),
            price: option.price || 0,
            eventImage: option.eventImage || ''
          }))
      }

      console.log('Creating hangout with data:', hangoutData)

      const response = await apiClient.createHangout(hangoutData)
      
      if (response.success) {
        toast.success('Hangout created successfully!')
        router.push(`/hangout/${response.data.id}`)
      } else {
        toast.error(response.error || 'Failed to create hangout')
      }
    } catch (error) {
      console.error('Error creating hangout:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Create New Hangout</h1>
          </div>
          <p className="text-gray-400 mb-8">
            Plan an amazing hangout with your friends
          </p>
          
          <NewHangoutForm 
            onSubmit={handleCreateHangout}
            isLoading={isCreating}
          />
        </div>
      </div>
    </div>
  )
}