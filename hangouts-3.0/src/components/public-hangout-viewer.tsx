'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Users, Calendar, Lock, UserPlus, Share2, Link as LinkIcon } from 'lucide-react'
import { format } from 'date-fns'
import { sharingService } from '@/lib/services/sharing-service'
import { CalendarButtons } from '@/components/ui/calendar-buttons'
import { EnhancedShareButton } from '@/components/sharing/enhanced-share-button'
import { GuestPrompt } from '@/components/guest-experience/guest-prompt'
import { useAutoJoin } from '@/hooks/use-auto-join'
import { useAuth } from '@clerk/nextjs'
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
  counts: {
    content_participants: number
  }
  participants?: Array<{
    id: string
    userId: string
    role: string
    joinedAt: string
    rsvpStatus: string
    canEdit: boolean
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
  }>
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
  const { userId } = useAuth()

  // Auto-join functionality for users coming from sign-in
  useAutoJoin({
    hangoutId,
    hangout,
    currentUserId: userId,
    onJoinSuccess: () => {
      // Refresh hangout data to show updated participants
      fetchHangout()
    }
  })

  useEffect(() => {
    fetchHangout()
  }, [hangoutId])

  const fetchHangout = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/hangouts/public/${hangoutId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        // Public API returns { hangout }, fall back to { data } for compatibility
        setHangout(data.hangout || data.data)
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
      // Redirect to sign-in with current hangout URL as redirect parameter
      const currentUrl = encodeURIComponent(window.location.href)
      window.location.href = `/signin?redirect_url=${currentUrl}`
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

  // Support both shapes: _count.participants (public API) and counts.content_participants (legacy)
  const goingCount = (hangout as any)?._count?.participants ?? (hangout as any)?.counts?.content_participants ?? 0

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'EEEE, MMMM do, yyyy')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      {/* Hero Image Header */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        {hangout.image ? (
          <>
            <img
              src={hangout.image}
              alt={hangout.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493] via-purple-600 to-blue-600" />
        )}
        
        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 pb-8">
          <div className="max-w-4xl mx-auto w-full">
            <Badge className="bg-[#FF1493]/90 text-white border-0 backdrop-blur-sm mb-4 text-sm px-4 py-1.5">
              {hangout.privacyLevel === 'PUBLIC' ? 'Public Hangout' : 'Private Hangout'}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-2xl" style={{ fontFamily: 'var(--font-oswald)' }}>
              {hangout.title}
            </h1>
            {hangout.description && (
              <p className="text-xl text-white/90 drop-shadow-lg leading-relaxed max-w-3xl">
                {hangout.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 pb-20">
        {/* Social FOMO Section */}
        <div className="mb-8 -mt-12 relative z-10">
          <Card className="bg-gradient-to-br from-gray-900 to-black border-[#FF1493]/30 shadow-2xl">
            <CardContent className="p-8">
              {/* Big participant count with FOMO */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 bg-[#FF1493]/10 border border-[#FF1493]/30 rounded-full px-6 py-3 mb-4">
                  <Users className="w-6 h-6 text-[#FF1493]" />
                  <span className="text-2xl font-bold text-white">{goingCount}</span>
                  <span className="text-gray-400">people going</span>
                </div>

                {/* Participant avatars - show all */}
                {hangout.participants && hangout.participants.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                    {hangout.participants.map((participant: any) => (
                      <div key={participant.userId} className="flex flex-col items-center gap-1">
                        <img
                          src={participant.user.avatar || '/placeholder-avatar.png'}
                          alt={participant.user.name}
                          className="w-12 h-12 rounded-full border-2 border-[#FF1493]/50 object-cover hover:scale-110 transition-transform"
                        />
                        <span className="text-xs text-gray-400">{participant.user.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-lg text-gray-300">
                  Join <span className="text-[#FF1493] font-semibold">{hangout.creator.name}</span>
                  {goingCount > 1 && <span> and {goingCount - 1} {goingCount === 2 ? 'other' : 'others'}</span>}
                </p>
              </div>

              {/* Event Details */}
              <div className="space-y-4 bg-black/30 rounded-xl p-6 border border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#FF1493]/10 border border-[#FF1493]/30 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-[#FF1493]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg">{formatDate(hangout.startTime)}</p>
                    <p className="text-gray-400">
                      {formatTime(hangout.startTime)} - {formatTime(hangout.endTime)}
                    </p>
                  </div>
                </div>

                {hangout.location && (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600/10 border border-purple-600/30 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-purple-400" />
                    </div>
                    <p className="text-white text-lg">{hangout.location}</p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600/10 border border-blue-600/30 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-gray-300">Hosted by <span className="text-white font-semibold">{hangout.creator.name}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Voting Options (if applicable) */}
        {hangout.requiresVoting && hangout.options && hangout.options.length > 1 && (
          <Card className="mb-6 bg-gradient-to-br from-gray-900 to-black border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <span className="text-purple-400">🗳️</span>
                Help Decide
              </CardTitle>
              <p className="text-gray-400">Vote on your preferred option</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hangout.options.map((option, index) => (
                  <div key={option.id} className="group relative p-5 border-2 border-gray-800 hover:border-[#FF1493]/50 rounded-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-black/50">
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-[#FF1493] group-hover:text-white group-hover:border-[#FF1493] transition-all">
                      {index + 1}
                    </div>
                    <h4 className="font-bold text-lg text-white mb-2">{option.title}</h4>
                    {option.description && (
                      <p className="text-gray-400 mb-3">{option.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {option.location && (
                        <span className="text-gray-400 flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {option.location}
                        </span>
                      )}
                      {option.price && (
                        <span className="text-green-400 flex items-center gap-1 font-semibold">
                          💰 ${option.price}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-5 bg-gradient-to-r from-[#FF1493]/10 to-purple-600/10 border border-[#FF1493]/30 rounded-xl text-center">
                <p className="text-white font-semibold mb-2">
                  Sign in to cast your vote
                </p>
                <p className="text-gray-400 text-sm">
                  Your vote helps the group decide together
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finalized Option (if voting is complete) */}
        {hangout.finalizedOption && (
          <Card className="mb-6 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Plan Confirmed!</CardTitle>
                  <p className="text-gray-400">The group has decided</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-black/50 border-2 border-green-500/30 rounded-xl">
                <h4 className="font-bold text-2xl text-white mb-3">{hangout.finalizedOption.title}</h4>
                {hangout.finalizedOption.description && (
                  <p className="text-gray-300 mb-4 text-lg">{hangout.finalizedOption.description}</p>
                )}
                <div className="space-y-3">
                  {hangout.finalizedOption.location && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-5 h-5 text-green-400" />
                      <span className="text-lg">{hangout.finalizedOption.location}</span>
                    </div>
                  )}
                  {hangout.finalizedOption.price && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-lg">💰 ${hangout.finalizedOption.price}</span>
                    </div>
                  )}
                </div>
                
                {/* Calendar Buttons for Finalized Plans */}
                <div className="mt-6 pt-6 border-t border-green-500/20">
                  <p className="text-green-400 font-semibold mb-3">Add to your calendar:</p>
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

        {/* Primary CTA for Guests */}
        <Card className="mb-6 bg-gradient-to-br from-[#FF1493]/20 via-purple-600/10 to-transparent border-2 border-[#FF1493]/50 shadow-2xl shadow-[#FF1493]/20">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-white mb-3">Want to join?</h3>
              <p className="text-xl text-gray-300 mb-6">
                Sign up in 30 seconds and RSVP to this hangout
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 justify-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Free forever · No credit card</span>
                </div>
                <div className="flex items-center gap-3 justify-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Create your own hangouts</span>
                </div>
                <div className="flex items-center gap-3 justify-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Vote on plans with friends</span>
                </div>
              </div>

              <Button
                onClick={handleSignInClick}
                size="lg"
                className="w-full bg-[#FF1493] hover:bg-[#E01180] text-white font-bold py-6 text-xl rounded-xl shadow-2xl shadow-[#FF1493]/50 hover:scale-105 transition-all mb-4"
              >
                <UserPlus className="w-6 h-6 mr-2" />
                Join This Hangout
              </Button>
              
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button 
                  onClick={() => {
                    const currentUrl = encodeURIComponent(window.location.href)
                    window.location.href = `/signin?redirect_url=${currentUrl}`
                  }}
                  className="text-[#FF1493] hover:text-[#E01180] underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Add Calendar Section */}
        <Card className="mb-6 bg-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-3 text-center">Add to your calendar now:</p>
            <CalendarButtons
              event={{
                title: hangout.title,
                description: hangout.description || '',
                location: hangout.location || '',
                startTime: hangout.startTime,
                endTime: hangout.endTime,
                url: typeof window !== 'undefined' ? window.location.href : ''
              }}
            />
          </CardContent>
        </Card>

        {/* Enhanced Share Button */}
        <div className="flex justify-center">
          <EnhancedShareButton
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={hangout.title}
            description={hangout.description}
            image={hangout.image}
            type="hangout"
            startTime={hangout.startTime}
            endTime={hangout.endTime}
            location={hangout.location}
            creator={hangout.creator.name}
            participants={hangout.counts?.content_participants || 0}
            privacyLevel={hangout.privacyLevel}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          />
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
