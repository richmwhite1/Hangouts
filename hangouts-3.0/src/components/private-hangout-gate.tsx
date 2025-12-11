'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { AuthIntentHandler } from '@/lib/auth-intent-handler'
import { logger } from '@/lib/logger'

interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  image?: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
}

interface PrivateHangoutGateProps {
  hangout: Hangout
}

export function PrivateHangoutGate({ hangout }: PrivateHangoutGateProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

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

  const handleViewProfile = () => {
    // Store intent before redirecting to profile
    AuthIntentHandler.storeIntent('view_friends_only', hangout.id, `/hangout/${hangout.id}`)

    setIsRedirecting(true)
    logger.info('Redirecting to host profile for friends-only hangout', {
      hangoutId: hangout.id,
      hostId: hangout.creator.id
    })

    // Redirect to host's profile
    router.push(`/profile/${hangout.creator.username}`)
  }

  const handleSignIn = () => {
    // Store intent before redirecting to sign-in
    AuthIntentHandler.storeIntent('view_friends_only', hangout.id, `/hangout/${hangout.id}`)

    setIsRedirecting(true)
    logger.info('Redirecting to sign-in for friends-only hangout', {
      hangoutId: hangout.id
    })

    // Redirect to sign-in
    router.push('/signin')
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Blurred Hangout Preview */}
        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-yellow-500" />
              <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-300 border-yellow-700/50">
                Friends Only
              </Badge>
            </div>
            <CardTitle className="text-white text-2xl">
              Private Hangout
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Blurred Content */}
            <div className="relative">
              {/* Background blur overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-lg z-10 flex items-center justify-center">
                <div className="text-center">
                  <EyeOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">Content hidden</p>
                </div>
              </div>

              {/* Actual content (blurred) */}
              <div className="filter blur-sm pointer-events-none">
                <h3 className="text-xl font-semibold text-white mb-2">{hangout.title}</h3>
                {hangout.description && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{hangout.description}</p>
                )}

                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{formatDate(hangout.startTime)}</span>
                  </div>
                  {hangout.location && (
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{hangout.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Gate */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-700/30">
          <CardHeader>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Eye className="w-5 h-5" />
              How to Access This Hangout
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Creator Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={hangout.creator.avatar} alt={hangout.creator.name} />
                <AvatarFallback className="bg-blue-600 text-white">
                  {hangout.creator.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-white font-medium">
                  This hangout is visible to friends of <span className="text-blue-400">{hangout.creator.name}</span> only
                </p>
                <p className="text-gray-400 text-sm">
                  @{hangout.creator.username}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleViewProfile}
                disabled={isRedirecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
              >
                {isRedirecting ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5 mr-2" />
                    View {hangout.creator.name}'s Profile
                  </>
                )}
              </Button>

              {!isSignedIn && (
                <Button
                  onClick={handleSignIn}
                  disabled={isRedirecting}
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-700 h-12"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Sign In to Access
                </Button>
              )}
            </div>

            {/* Helper Text */}
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Send {hangout.creator.name} a friend request to view this hangout invitation.
                {!isSignedIn && ' Sign in to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}