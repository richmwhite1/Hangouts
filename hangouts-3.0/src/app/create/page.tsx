'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
// Removed apiClient import - using direct fetch instead
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export default function CreateHangoutPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show sign-in prompt immediately if not authenticated (don't wait for isLoaded or isClient)
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-300 mb-6">
              Please sign in to create hangouts and events
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/signup'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Sign Up
              </button>
              <button
                onClick={() => window.location.href = '/signin'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Wait for client-side hydration only for authenticated users
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

  // Debug authentication state
  console.log('Create page auth state:', { isSignedIn, isLoaded, isClient })
  
  // Debug token retrieval
  const debugToken = async () => {
    try {
      const token = await getToken()
      console.log('Debug token result:', { 
        token: token ? token.substring(0, 20) + '...' : 'null',
        tokenLength: token?.length || 0,
        isSignedIn
      })
    } catch (error) {
      console.error('Debug token error:', error)
    }
  }
  
  // Call debug function
  if (isClient && isLoaded && isSignedIn) {
    debugToken()
  }

  // Check authentication state - only check isSignedIn, not user object
  if (!isSignedIn) {
    console.log('⚠️ User not authenticated:', { isSignedIn });
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-300 mb-6">
              Please sign in to create hangouts and events
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/signup'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Sign Up
              </button>
              <button
                onClick={() => window.location.href = '/signin'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
    // return (
    //   <div className="min-h-screen bg-black flex items-center justify-center">
    //     <div className="max-w-md mx-auto p-6">
    //       <div className="bg-gray-900 rounded-lg p-8 text-center">
    //         <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
    //         <p className="text-gray-300 mb-6">
    //           Please sign in to create hangouts and events
    //         </p>
    //         <div className="flex flex-col sm:flex-row gap-3 justify-center">
    //           <button
    //             onClick={() => window.location.href = '/signup'}
    //             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
    //           >
    //             Get Started Free
    //           </button>
    //           <button
    //             onClick={() => window.location.href = '/signin'}
    //             className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium"
    //           >
    //             Sign In
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // )
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
      const token = await getToken()
      console.log('Frontend - Token retrieved:', token ? 'YES' : 'NO')
      console.log('Frontend - Token length:', token?.length || 0)
      console.log('Frontend - Token preview:', token ? token.substring(0, 20) + '...' : 'null')
      if (!token) {
        console.error('Frontend - No token available, user might not be authenticated')
        console.error('Frontend - Auth state:', { isSignedIn, isLoaded })
        toast.error('Authentication required. Please sign in.')
        return
      }
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: uploadFormData
          })
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            imageUrl = uploadData.url
            // console.log('Image uploaded successfully:', imageUrl); // Removed for production
          } else {
            logger.error('Image upload failed:', uploadResponse.status);
            toast.error('Failed to upload image')
            return
          }
        } catch (uploadError) {
          logger.error('Error uploading image:', uploadError);
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
      // console.log('Creating hangout with data:', hangoutData); // Removed for production
      const token = await getToken()
      console.log('Frontend - Hangout creation token:', token ? 'YES' : 'NO')
      console.log('Frontend - Hangout creation token length:', token?.length || 0)
      if (!token) {
        console.error('Frontend - No token available for hangout creation')
        console.error('Frontend - Auth state:', { isSignedIn, isLoaded })
        toast.error('Authentication required. Please sign in.')
        return
      }
      const response = await fetch('/api/hangouts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(hangoutData)})
      const responseData = await response.json()
      if (responseData.success) {
        toast.success('Hangout created successfully!')
        router.push(`/hangout/${responseData.data.id}`)
      } else {
        toast.error(responseData.error || 'Failed to create hangout')
      }
    } catch (error) {
      logger.error('Error creating hangout:', error);
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