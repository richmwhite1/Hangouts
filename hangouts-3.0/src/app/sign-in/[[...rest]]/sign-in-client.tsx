'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { clearAllAuthData } from '@/lib/sign-out-utils'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Users, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface SignInPageClientProps {
  redirectUrl: string
}

interface HangoutContext {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  creator: {
    name: string
    avatar?: string
  }
  participants?: Array<{
    user: {
      name: string
      avatar?: string
    }
  }>
  _count?: {
    participants: number
  }
}

export function SignInPageClient({ redirectUrl }: SignInPageClientProps) {
  const [isHangoutJoin, setIsHangoutJoin] = useState(false)
  const [hangoutContext, setHangoutContext] = useState<HangoutContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  
  // Clear any stale auth data when the sign-in page loads
  // This ensures a clean sign-in experience
  useEffect(() => {
    clearAllAuthData()
    
    // Check if redirect URL is for a public hangout (indicates join flow)
    if (redirectUrl && redirectUrl.includes('/hangouts/public/')) {
      setIsHangoutJoin(true)
      logger.info('Sign-in for hangout join', { redirectUrl })
      
      // Extract hangout ID and fetch context
      const hangoutId = redirectUrl.split('/hangouts/public/')[1]?.split('?')[0]
      if (hangoutId) {
        fetchHangoutContext(hangoutId)
      }
    }
  }, [redirectUrl])

  const fetchHangoutContext = async (hangoutId: string) => {
    setIsLoadingContext(true)
    try {
      const response = await fetch(`/api/hangouts/public/${hangoutId}`)
      if (response.ok) {
        const data = await response.json()
        setHangoutContext(data.hangout)
        logger.info('Fetched hangout context for sign-in', { hangoutId, title: data.hangout?.title })
      }
    } catch (error) {
      logger.error('Error fetching hangout context:', error)
    } finally {
      setIsLoadingContext(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Hangout Context Card */}
        {isHangoutJoin && hangoutContext && (
          <Card className="mb-6 bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-center text-lg">
                You're joining
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hangout Title */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {hangoutContext.title}
                </h2>
                {hangoutContext.description && (
                  <p className="text-gray-400 text-sm">
                    {hangoutContext.description.length > 100 
                      ? `${hangoutContext.description.substring(0, 100)}...` 
                      : hangoutContext.description}
                  </p>
                )}
              </div>

              {/* Event Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>{formatDate(hangoutContext.startTime)}</span>
                </div>
                
                {hangoutContext.location && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <span>{hangoutContext.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>{hangoutContext._count?.participants || 0} people going</span>
                </div>
              </div>

              {/* Participant Avatars */}
              {hangoutContext.participants && hangoutContext.participants.length > 0 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="flex -space-x-2">
                    {hangoutContext.participants.slice(0, 5).map((participant, index) => (
                      <Avatar 
                        key={index} 
                        className="w-8 h-8 border-2 border-gray-900"
                      >
                        <AvatarImage 
                          src={participant.user.avatar || undefined} 
                          alt={participant.user.name} 
                        />
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {participant.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {(hangoutContext._count?.participants || 0) > 5 && (
                      <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center">
                        <span className="text-xs text-gray-300">
                          +{(hangoutContext._count?.participants || 0) - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Message */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 text-center">
                <p className="text-blue-300 text-sm">
                  ✨ You'll be automatically added after signing in
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Context */}
        {isHangoutJoin && isLoadingContext && (
          <div className="mb-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading hangout details...</p>
          </div>
        )}

        {/* Basic Message for hangout join without context */}
        {isHangoutJoin && !hangoutContext && !isLoadingContext && (
          <div className="mb-6 text-center">
            <p className="text-white text-lg font-semibold mb-2">
              Sign in to join the hangout
            </p>
            <p className="text-gray-400 text-sm">
              After signing in, you'll be automatically added as a participant.
            </p>
          </div>
        )}

        {/* Clerk Sign-In Component */}
        <SignIn 
          redirectUrl={redirectUrl}
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'bg-gray-900 border-gray-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
              formFieldInput: 'bg-gray-800 border-gray-600 text-white',
              formFieldLabel: 'text-gray-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300'
            }
          }}
        />
      </div>
    </div>
  )
}

