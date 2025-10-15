'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  Globe,
  Lock,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Share2,
  UserPlus,
  CalendarPlus,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import { logger } from '@/lib/logger'

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

interface Comment {
  id: string
  text: string
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export function PublicHangoutViewer({ params }: Props) {
  const [currentHangout, setCurrentHangout] = useState<Hangout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [hangoutId, setHangoutId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setHangoutId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
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
        
        // Fetch comments (if available)
        try {
          const commentsResponse = await fetch(`/api/hangouts/${hangoutId}/comments`)
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json()
            setComments(commentsData.comments || [])
          }
        } catch (commentError) {
          // Comments are optional for public view
          logger.warn('Could not fetch comments:', commentError)
        }
      } catch (err) {
        logger.error('Error fetching hangout:', err);
        setError(err instanceof Error ? err.message : 'Failed to load hangout')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHangout()
  }, [hangoutId])

  const handleShare = async () => {
    if (!currentHangout) return

    const shareUrl = `${window.location.origin}/hangouts/public/${hangoutId}`
    const shareText = `Come check out ${currentHangout.title} hangout!\n\n${currentHangout.description || 'Join us for this hangout!'}\n\nWhen: ${formatDate(currentHangout.startTime)}\nWhere: ${currentHangout.location || 'TBD'}\n\n${shareUrl}`

    // Check if native sharing is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Come check out ${currentHangout.title} hangout!`,
          text: shareText,
          url: shareUrl
        })
      } catch (error) {
        // User cancelled sharing or error occurred
        logger.warn('Share cancelled or failed:', error)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        // Success - no popup needed
      } catch (error) {
        logger.error('Failed to copy to clipboard:', error);
        // Final fallback: show the URL
        prompt('Copy this link to share:', shareUrl)
      }
    }
  }

  const handleSignIn = () => {
    router.push('/signin')
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading hangout...</p>
        </div>
      </div>
    )
  }

  if (error || !currentHangout) {
    const isPrivacyError = error?.includes('not public') || error?.includes('not found')
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {error || 'Hangout not found'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            {isPrivacyError 
              ? 'This hangout is private or friends-only. Sign in to view it.'
              : 'This hangout may have been deleted or is not available.'
            }
          </p>
          {isPrivacyError && (
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/signin'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                Sign In to View
              </Button>
              <p className="text-xs text-gray-400">
                Only friends of the host can view this hangout
              </p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hangout Details
          </h1>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <Card className="overflow-hidden">
          {currentHangout.image && (
            <div className="aspect-video bg-gradient-to-r from-blue-500 to-purple-600 relative">
              <img
                src={currentHangout.image}
                alt={currentHangout.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-20" />
            </div>
          )}
          
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentHangout.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(currentHangout.startTime)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(currentHangout.startTime)} - {formatTime(currentHangout.endTime)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddToCalendar}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Add to Calendar"
                >
                  <CalendarPlus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Location */}
            {currentHangout.location && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {currentHangout.location}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {currentHangout.description && (
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  {currentHangout.description}
                </p>
              </div>
            )}

            {/* Creator */}
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentHangout.creator.avatar} />
                <AvatarFallback>
                  {currentHangout.creator.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Created by {currentHangout.creator.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  @{currentHangout.creator.username}
                </p>
              </div>
            </div>

            {/* RSVP Counts */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {rsvpCounts.yes} going
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {rsvpCounts.maybe} maybe
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Participants ({currentHangout.participants.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {currentHangout.participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.user.avatar} />
                    <AvatarFallback>
                      {participant.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {participant.user.name}
                    </p>
                    <div className="flex items-center space-x-2">
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comments ({comments.length})
            </h3>
          </CardHeader>
          <CardContent>
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback>
                        {comment.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No comments yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions for Non-Authenticated Users */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Add to Calendar */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="text-center py-6">
              <CalendarPlus className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Add to Calendar
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Save this hangout to your calendar and never miss it!
              </p>
              <Button 
                onClick={handleAddToCalendar} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Add to Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Sign In CTA */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="text-center py-6">
              <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Want to join this hangout?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Sign in to RSVP, comment, and connect with other participants!
              </p>
              <Button onClick={handleSignIn} className="w-full">
                Sign In to Join
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
