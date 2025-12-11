'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from "@clerk/nextjs"
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
import { SimplifiedHangoutForm } from '@/components/create/SimplifiedHangoutForm'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Sparkles, Settings, Vote, BarChart3, Sliders } from 'lucide-react'

export default function CreateHangoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded, userId } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [mode, setMode] = useState<'simple' | 'advanced'>('advanced') // Default to advanced mode for testing
  const [simpleFormData, setSimpleFormData] = useState<{
    title: string
    dateTime: string
    location: string
    participants: string[]
  } | null>(null)

  // Check URL param for mode preference
  useEffect(() => {
    const urlMode = searchParams.get('mode')
    if (urlMode === 'advanced') {
      setMode('advanced')
    } else {
      // Check localStorage for user preference
      const savedMode = localStorage.getItem('hangout-create-mode')
      if (savedMode === 'advanced') {
        setMode('advanced')
      }
    }
  }, [searchParams])

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

  const handleCreateHangout = async (formData: NewHangoutFormData | any) => {
    try {
      setIsCreating(true)

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

  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'advanced' : 'simple'
    setMode(newMode)
    localStorage.setItem('hangout-create-mode', newMode)
    toast.info(newMode === 'simple' ? '⚡ Quick Hangout mode' : '🗳️ Advanced Hangout mode')
  }

  const handleSimpleFormDataChange = (data: { title: string; dateTime: string; location: string; participants: string[] }) => {
    // Only store if there's meaningful data
    if (data.title || data.dateTime || data.location || data.participants.length > 0) {
      setSimpleFormData(data)
    }
  }

  return (
    <div className="min-h-screen bg-black pt-safe overflow-x-hidden pb-safe">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-32 sm:pb-20">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create Hangout</h1>
              <p className="text-sm sm:text-base text-gray-400">
                {mode === 'simple' 
                  ? '⚡ Quick and easy - takes just 30 seconds'
                  : '⚙️ Advanced options for polls and complex plans'
                }
              </p>
            </div>
            
            {/* Mode Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMode}
              className="border-gray-700 text-white hover:bg-gray-800 flex items-center gap-2"
            >
              {mode === 'simple' ? (
                <>
                  <Vote className="w-4 h-4 text-purple-400" />
                  <span className="hidden sm:inline">Advanced Hangout</span>
                  <span className="sm:hidden">Advanced</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">Quick Hangout</span>
                  <span className="sm:hidden">Quick</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {mode === 'simple' ? (
          <SimplifiedHangoutForm
            onSubmit={handleCreateHangout}
            isLoading={isCreating}
            onDataChange={handleSimpleFormDataChange}
          />
        ) : (
          <NewHangoutForm
            onSubmit={handleCreateHangout}
            isLoading={isCreating}
            prefillFromSimple={simpleFormData}
          />
        )}
      </div>
    </div>
  )
}