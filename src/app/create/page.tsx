'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
import { clerkApiClient } from '@/lib/clerk-api-client'
import { toast } from 'sonner'

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'

export default function CreateHangoutPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [getToken, setGetToken] = useState<(() => Promise<string | null>) | null>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import Clerk hooks only on client side
    if (typeof window !== 'undefined') {
      import('@clerk/nextjs').then((clerk) => {
        try {
          const { useAuth, useUser } = clerk
          const authResult = useAuth()
          const userResult = useUser()
          
          setIsSignedIn(authResult.isSignedIn)
          setUser(userResult.user)
          setGetToken(() => authResult.getToken)
        } catch (error) {
          console.log('Clerk hooks not available:', error)
        }
      }).catch((error) => {
        console.log('Clerk not available:', error)
      })
    }
  }, [])

  useEffect(() => {
    if (isClient && !isSignedIn) {
      router.push('/login')
    }
  }, [isClient, isSignedIn, router])

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

  if (!isSignedIn || !user) {
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

          const token = getToken ? await getToken() : null
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
            eventImage: (option as any).eventImage || ''
          }))
      }

      console.log('Creating hangout with data:', hangoutData)

      const response = await clerkApiClient.createHangout(hangoutData, getToken || (() => Promise.resolve(null))) as any
      
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