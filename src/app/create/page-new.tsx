'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import HangoutForm, { HangoutFormData } from '@/components/create/HangoutForm'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export default function CreateHangoutPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user, token } = useAuth()
  const [isCreating, setIsCreating] = useState(false)

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user || !token) {
    router.push('/login')
    return null
  }

  const handleCreateHangout = async (formData: HangoutFormData) => {
    try {
      setIsCreating(true)
      
      const hangoutData = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        maxParticipants: formData.maxParticipants || null,
        weatherEnabled: formData.weatherEnabled,
        isPoll: formData.isPoll
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Hangout</h1>
            <p className="text-muted-foreground">
              Plan an amazing hangout with your friends
            </p>
          </div>
          
          <HangoutForm 
            onSubmit={handleCreateHangout}
            isLoading={isCreating}
          />
        </div>
      </div>
    </div>
  )
}







