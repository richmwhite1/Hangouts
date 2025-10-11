'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Users, Calendar, Lock, UserPlus, Share2, Link as LinkIcon, Heart } from 'lucide-react'
import { format } from 'date-fns'
import { sharingService } from '@/lib/services/sharing-service'
import { CalendarButtons } from '@/components/ui/calendar-buttons'
// import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface PublicHangoutViewerProps {
  hangoutId: string
  onSignInRequired?: () => void
}

interface HangoutData {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime: string
  endTime: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creator: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  _count: {
    content_participants: number
  }
  state: string
  finalizedOption?: any
  requiresVoting: boolean
  options: Array<{
    id: string
    title: string
    description?: string
    location?: string
    dateTime?: string
    price?: number
  }>
}

export function PublicHangoutViewer({ hangoutId, onSignInRequired }: PublicHangoutViewerProps) {
  const [hangout, setHangout] = useState<HangoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // const { isAuthenticated } = useAuth()

  useEffect(() => {
    fetchHangout()
  }, [hangoutId])

  const fetchHangout = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/hangouts/${hangoutId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setHangout(data.hangout)
      } else {
        if (response.status === 403) {
          setError('This hangout is not public')
        } else if (response.status === 404) {
          setError('Hangout not found')
        } else {
          setError(data.error || 'Failed to load hangout')
        }
      }
    } catch (error) {
      logger.error('Error fetching hangout:', error);
      setError('Failed to load hangout')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignInClick = () => {
    if (onSignInRequired) {
      onSignInRequired()
    } else {
      window.location.href = '/signin'
    }
  }

  const handleShare = async () => {
    if (!hangout) return

    const shareData = {
      title: hangout.title,
      description: hangout.description || '',
      image: hangout.image || '',
      url: sharingService.generateShareUrl(hangout.id, 'hangout'),
      type: 'hangout' as const,
      privacyLevel: hangout.privacyLevel
    }

    await sharingService.shareContent(shareData)
  }

  const handleCopyLink = async () => {
    if (!hangout) return
    await sharingService.copyLink(hangout.id, 'hangout')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading hangout...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <Lock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={handleSignInClick} className="w-full">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hangout) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p>Hangout not found</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'EEEE, MMMM do, yyyy')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{hangout.title}</h1>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {hangout.privacyLevel === 'PUBLIC' ? 'Public' : 'Private'}
            </Badge>
          </div>
          <p className="text-white/90 text-lg">{hangout.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 pb-20">
        {/* Image */}
        {hangout.image && (
          <div className="mb-6">
            <img
              src={hangout.image}
              alt={hangout.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Event Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium">{formatDate(hangout.startTime)}</p>
                <p className="text-gray-400">
                  {formatTime(hangout.startTime)} - {formatTime(hangout.endTime)}
                </p>
              </div>
            </div>

            {hangout.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-400" />
                <p>{hangout.location}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-400" />
              <p>{hangout._count.content_participants} people going</p>
            </div>

            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-orange-400" />
              <p>Created by {hangout.creator.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* Voting Options (if applicable) */}
        {hangout.requiresVoting && hangout.options && hangout.options.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Voting Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hangout.options.map((option) => (
                  <div key={option.id} className="p-4 border border-gray-700 rounded-lg">
                    <h4 className="font-medium mb-2">{option.title}</h4>
                    {option.description && (
                      <p className="text-gray-400 text-sm mb-2">{option.description}</p>
                    )}
                    {option.location && (
                      <p className="text-gray-400 text-sm">📍 {option.location}</p>
                    )}
                    {option.price && (
                      <p className="text-gray-400 text-sm">💰 ${option.price}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-900/20 rounded-lg">
                <p className="text-blue-300 text-sm">
                  🔒 Sign in to vote on your preferred option
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finalized Option (if voting is complete) */}
        {hangout.finalizedOption && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Confirmed Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <h4 className="font-medium mb-2">{hangout.finalizedOption.title}</h4>
                {hangout.finalizedOption.description && (
                  <p className="text-gray-300 mb-2">{hangout.finalizedOption.description}</p>
                )}
                {hangout.finalizedOption.location && (
                  <p className="text-gray-400 text-sm">📍 {hangout.finalizedOption.location}</p>
                )}
                {hangout.finalizedOption.price && (
                  <p className="text-gray-400 text-sm">💰 ${hangout.finalizedOption.price}</p>
                )}
                
                {/* Calendar Buttons for Finalized Plans */}
                <div className="mt-4 pt-4 border-t border-green-700">
                  <p className="text-green-300 text-sm mb-3">Add to your calendar:</p>
                  <CalendarButtons
                    event={{
                      title: hangout.title,
                      description: hangout.description || hangout.finalizedOption.description,
                      location: hangout.finalizedOption.location || hangout.location,
                      startTime: hangout.finalizedOption.dateTime || hangout.startTime,
                      endTime: hangout.endTime,
                      url: window.location.href
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleSignInClick}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Sign In to Join
          </Button>
          
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              title="Share this hangout"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              title="Copy link to hangout"
            >
              <LinkIcon className="w-5 h-5 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>

        {/* Privacy Notice */}
        {hangout.privacyLevel !== 'PUBLIC' && (
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm">
              {sharingService.getPrivacyMessage(hangout.privacyLevel)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
