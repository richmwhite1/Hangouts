'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from "@clerk/nextjs"
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export default function CreateHangoutPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded, userId } = useAuth()
  const [isCreating, setIsCreating] = useState(false)

  // Handle redirect in useEffect to avoid SSR issues
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !userId)) {
      router.push('/login')
    }
  }, [isLoaded, isSignedIn, userId, router])

  // Wait for both client-side hydration and Clerk authentication to load
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn || !userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  const handleCreateHangout = async (formData: NewHangoutFormData) => {
    try {
      setIsCreating(true)

      // Transform NewHangoutFormData to the API expected format
      // The backend likely expects a structure similar to what NewHangoutForm produces
      // but we should ensure it matches what apiClient.createHangout expects.
      // Since apiClient.createHangout takes 'any', we pass the formData directly
      // or map it if necessary. Based on NewHangoutForm, it produces a comprehensive object.

      const response = await apiClient.createHangout(formData)

      if (response.success) {
        toast.success('Hangout created successfully!')
        router.push(`/hangout/${response.data.id}`)
      } else {
        toast.error(response.error || 'Failed to create hangout')
      }
    } catch (error) {
      logger.error('Error creating hangout:', error);
      toast.error('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-safe">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Hangout</h1>
            <p className="text-muted-foreground">
              Plan an amazing hangout with your friends
            </p>
          </div>

          <NewHangoutForm
            onSubmit={handleCreateHangout}
            isLoading={isCreating}
          />
        </div>
      </div>
    </div>
  )
}