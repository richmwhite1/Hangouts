'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  ArrowLeft,
  Share2,
  UserPlus,
  CalendarPlus,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import { logger } from '@/lib/logger'
import { ShareModal } from '@/components/sharing/share-modal'
import { useAuth } from '@clerk/nextjs'
import { useAutoJoin } from '@/hooks/use-auto-join'
import { AuthIntentHandler } from '@/lib/auth-intent-handler'
import { toast } from 'sonner'

interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creatorId: string
  creator: { 
    name: string
    username: string
    avatar?: string
  }
  participants: Array<{
    id: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
  }>
  _count: { participants: number }
  latitude?: number
  longitude?: number
  weatherEnabled: boolean
  maxParticipants?: number
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  image?: string
  photos?: string[]
  isPolling?: boolean
  pollOptions?: Array<{
    id: string
    text: string
    votes: number
    voters: string[]
  }>
  consensusReached?: boolean
  consensusThreshold?: number
}

// Comment interface removed - not needed for public viewing

interface Props {
  params: Promise<{ id: string }>
}

export function PublicHangoutViewer({ params }: Props) {
  const [currentHangout, setCurrentHangout] = useState<Hangout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Comments not available for public viewing
  const [hangoutId, setHangoutId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const router = useRouter()
  const { userId, isSignedIn, isLoaded } = useAuth()

  // Auto-join functionality for users coming from sign-in
  useAutoJoin({
    hangoutId: hangoutId || '',
    hangout: currentHangout,
    ...(userId && { currentUserId: userId }),
    onJoinSuccess: () => {
      // Refresh hangout data to show updated participants
      if (hangoutId) {
        fetchHangout()
      }
    }
  })

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setHangoutId(resolvedParams.id)
    }
    getParams()
  }, [params])

  const fetchHangout = async () => {
    if (!hangoutId) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch hangout details from public API
      const response = await fetch(`/api/hangouts/public/${hangoutId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Hangout not found')
      }
      
      const data = await response.json()
      setCurrentHangout(data.hangout)
      
      // Comments not available for public viewing
    } catch (err) {
      logger.error('Error fetching hangout:', err);
      setError(err instanceof Error ? err.message : 'Failed to load hangout')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHangout()
  }, [hangoutId])


  const handleSignIn = () => {
    // If user is already signed in, try to join directly
    if (isSignedIn && isLoaded && userId) {
      handleDirectJoin()
      return
    }

    // Store auth intent before redirecting to sign-in
    // This ensures the user gets added as a participant after authentication
    AuthIntentHandler.storeIntent('join', hangoutId)

    // Redirect to sign-in page
    setIsJoining(true)
    router.push('/signin')
  }
  
  const handleDirectJoin = async () => {
    if (!hangoutId || !userId) return
    
    setIsJoining(true)
    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        // Redirect to authenticated hangout page
        window.location.href = `/hangout/${hangoutId}`
      } else {
        const errorData = await response.json()
        logger.error('Direct join failed:', errorData)
        // If already a participant, just redirect
        if (response.status === 400 && errorData.error?.includes('already')) {
          window.location.href = `/hangout/${hangoutId}`
        } else {
          toast.error(errorData.error || 'Failed to join hangout')
          setIsJoining(false)
        }
      }
    } catch (error) {
      logger.error('Error joining hangout:', error)
      toast.error('Failed to join hangout. Please try again.')
      setIsJoining(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!currentHangout) return

    const startDate = new Date(currentHangout.startTime)
    const endDate = new Date(currentHangout.endTime)
    
    // Format dates for calendar
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const start = formatDate(startDate)
    const end = formatDate(endDate)
    
    const title = currentHangout.title
    const description = currentHangout.description || 'Join us for this hangout!'
    const location = currentHangout.location || ''
    
    // Create calendar URLs
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`
    
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`
    
    const appleUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`

    // Show calendar options
    const calendarOptions = [
      { name: 'Google Calendar', url: googleCalendarUrl, icon: '📅' },
      { name: 'Outlook', url: outlookUrl, icon: '📧' },
      { name: 'Apple Calendar', url: appleUrl, icon: '🍎', isData: true }
    ]

    // Create a simple modal for calendar options
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add to Calendar</h3>
        <div class="space-y-3">
          ${calendarOptions.map(option => `
            <a href="${option.url}" ${option.isData ? 'download="hangout.ics"' : 'target="_blank"'} 
               class="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span class="text-2xl">${option.icon}</span>
              <span class="text-gray-900 dark:text-white">${option.name}</span>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
          `).join('')}
        </div>
        <div class="flex justify-end mt-6">
          <button onclick="this.closest('.fixed').remove()" 
                  class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Cancel
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-700 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !currentHangout) {
    const isPrivacyError = error?.includes('not public') || error?.includes('not found')
    
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Hangout Not Found</h1>
          <p className="text-gray-400 mb-6">
            {isPrivacyError 
              ? 'This hangout is private or friends-only. Sign in to view it.'
              : 'This hangout may have been deleted or is not available.'
            }
          </p>
          {isPrivacyError && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleSignIn}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/signup'}
                variant="outline" 
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    })
  }

  const getRSVPCounts = () => {
    const counts = { yes: 0, no: 0, maybe: 0, pending: 0 }
    currentHangout.participants.forEach(p => {
      switch (p.rsvpStatus) {
        case 'YES': counts.yes++; break
        case 'NO': counts.no++; break
        case 'MAYBE': counts.maybe++; break
        case 'PENDING': counts.pending++; break
      }
    })
    return counts
  }

  const rsvpCounts = getRSVPCounts()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-400/30">
              Public Hangout
            </Badge>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{currentHangout.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(currentHangout.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(currentHangout.startTime)} - {formatTime(currentHangout.endTime)}</span>
            </div>
            {currentHangout.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{currentHangout.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{rsvpCounts.yes} going</span>
            </div>
          </div>
        </div>
      </div>

      {/* Join Hangout CTA Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Join This Hangout</h2>
              <p className="text-gray-300 text-sm mb-4">
                Sign in to join, RSVP, vote on options, and chat with other participants.
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                {rsvpCounts.yes > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{rsvpCounts.yes} going</span>
                  </div>
                )}
                {currentHangout.participants && currentHangout.participants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">•</span>
                    <span>{currentHangout.participants.length} invited</span>
                  </div>
                )}
              </div>
              {/* Show participant avatars for social proof */}
              {currentHangout.participants && currentHangout.participants.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {currentHangout.participants.slice(0, 5).map((participant) => (
                      <Avatar key={participant.id} className="w-8 h-8 border-2 border-gray-800">
                        <AvatarImage src={participant.user?.avatar} alt={participant.user?.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {participant.user?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {currentHangout.participants.length > 5 && (
                    <span className="text-xs text-gray-400 ml-2">
                      +{currentHangout.participants.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold flex-1 min-h-[52px]"
                onClick={handleSignIn}
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {userId ? 'Joining...' : 'Redirecting to sign in...'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    {userId ? 'Join Hangout' : 'Sign In to Join'}
                  </>
                )}
              </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={handleAddToCalendar}
            >
              <CalendarPlus className="w-5 h-5 mr-2" />
              Add to Calendar
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>
          {!userId && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                New to Plans? <button onClick={() => router.push(`/signup?redirect_url=${encodeURIComponent(window.location.href)}`)} className="text-blue-400 hover:text-blue-300 underline">Sign up for free</button> to join this hangout.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hangout Image */}
            {currentHangout.image && (
              <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden">
                <img 
                  src={currentHangout.image} 
                  alt={currentHangout.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            {currentHangout.description && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">About This Hangout</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 whitespace-pre-wrap">{currentHangout.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Hangout Details */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Hangout Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Date & Time</p>
                    <p className="text-gray-300">
                      {formatDate(currentHangout.startTime)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatTime(currentHangout.startTime)} - {formatTime(currentHangout.endTime)}
                    </p>
                  </div>
                </div>

                {currentHangout.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Location</p>
                      <p className="text-gray-300">{currentHangout.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Participants</p>
                    <p className="text-gray-300">{rsvpCounts.yes} going, {rsvpCounts.maybe} maybe</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator Info */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Created by</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentHangout.creator.avatar} />
                    <AvatarFallback>
                      {currentHangout.creator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{currentHangout.creator.name}</p>
                    <p className="text-sm text-gray-400">@{currentHangout.creator.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Who's Going</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{currentHangout.participants.length} people</span>
                  </div>
                  
                  {currentHangout.participants.length > 0 && (
                    <div className="space-y-2">
                      {currentHangout.participants.slice(0, 5).map((participant) => (
                        <div key={participant.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={participant.user.avatar} />
                            <AvatarFallback>
                              {participant.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-300">{participant.user.name}</span>
                          <Badge 
                            variant={
                              participant.rsvpStatus === 'YES' ? 'default' :
                              participant.rsvpStatus === 'MAYBE' ? 'secondary' :
                              participant.rsvpStatus === 'NO' ? 'destructive' : 'outline'
                            }
                            className="text-xs"
                          >
                            {participant.rsvpStatus}
                          </Badge>
                        </div>
                      ))}
                      {currentHangout.participants.length > 5 && (
                        <p className="text-sm text-gray-400">
                          +{currentHangout.participants.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sign Up Prompt */}
            <Card className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-400/30">
              <CardHeader>
                <CardTitle className="text-white">Want to join this hangout?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Sign up to RSVP, get updates, and connect with other participants!
                </p>
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleSignIn}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Hangout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 text-white hover:bg-gray-700"
                    onClick={() => window.location.href = '/signup'}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={`${window.location.origin}/hangouts/public/${hangoutId}`}
          title={currentHangout.title}
          description={currentHangout.description || ''}
          type="hangout"
          startTime={currentHangout.startTime}
          endTime={currentHangout.endTime}
          location={currentHangout.location || ''}
          hostName={currentHangout.creator.name}
          image={currentHangout.image || ''}
        />
    </div>
  )
}
