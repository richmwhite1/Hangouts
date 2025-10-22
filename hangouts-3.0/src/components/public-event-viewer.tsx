'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Users, Calendar, Lock, UserPlus, Share2, Link as LinkIcon, DollarSign, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { sharingService } from '@/lib/services/sharing-service'
import { CalendarButtons } from '@/components/ui/calendar-buttons'
import { EnhancedShareButton } from '@/components/sharing/enhanced-share-button'
import { GuestPrompt } from '@/components/guest-experience/guest-prompt'
import { logger } from '@/lib/logger'

interface PublicEventViewerProps {
  eventId: string
  onSignInRequired?: () => void
}

interface EventData {
  id: string
  title: string
  description?: string
  image?: string
  venue?: string
  city?: string
  startDate: string
  endDate?: string
  startTime?: string
  endTime?: string
  price?: number
  category?: string
  tags?: string[]
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creator: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  counts: {
    rsvps: number
  }
  rsvps?: Array<{
    id: string
    userId: string
    status: string
    createdAt: string
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
  }>
}

export function PublicEventViewer({ eventId, onSignInRequired }: PublicEventViewerProps) {
  const [event, setEvent] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/events/${eventId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setEvent(data.data)
      } else {
        if (response.status === 403) {
          setError('This event is not public')
        } else if (response.status === 404) {
          setError('Event not found')
        } else {
          setError(data.error || 'Failed to load event')
        }
      }
    } catch (error) {
      logger.error('Error fetching event:', error);
      setError('Failed to load event')
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading event...</p>
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

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p>Event not found</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid date'
    return format(date, 'EEEE, MMMM do, yyyy')
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Time not available'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid time'
    return format(date, 'h:mm a')
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    return `$${price.toFixed(2)}`
  }

  const displayLocation = event.city ? `${event.venue}, ${event.city}` : event.venue

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-2">
              {event.category && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Tag className="w-3 h-3 mr-1" />
                  {event.category}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-white/20 text-white">
                {event.privacyLevel === 'PUBLIC' ? 'Public' : 'Private'}
              </Badge>
            </div>
          </div>
          <p className="text-white/90 text-lg">{event.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 pb-20">
        {/* Image */}
        {event.image && (
          <div className="mb-6">
            <img
              src={event.image}
              alt={event.title}
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
              <Clock className="h-5 w-5 text-green-400" />
              <div>
                <p className="font-medium">{formatDate(event.startTime)}</p>
                {event.startTime && (
                  <p className="text-gray-400">
                    {formatTime(event.startTime)}
                    {event.endTime && ` - ${formatTime(event.endTime)}`}
                  </p>
                )}
              </div>
            </div>

            {displayLocation && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-400" />
                <p>{displayLocation}</p>
              </div>
            )}

            {event.price !== undefined && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                <p>{formatPrice(event.price)}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-400" />
              <div className="flex items-center gap-2">
                <p>{event.counts?.rsvps || 0} people attending</p>
                {/* Show attendee avatars */}
                {event.rsvps && event.rsvps.length > 0 && (
                  <div className="flex -space-x-2">
                    {event.rsvps.slice(0, 5).map((rsvp: any) => (
                      <img
                        key={rsvp.userId}
                        src={rsvp.user.avatar || '/placeholder-avatar.png'}
                        alt={rsvp.user.name}
                        className="w-6 h-6 rounded-full border-2 border-gray-800 object-cover"
                        title={rsvp.user.name}
                      />
                    ))}
                    {event.rsvps.length > 5 && (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center">
                        <span className="text-xs text-gray-300">+{event.rsvps.length - 5}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-orange-400" />
              <p>Hosted by {event.creator.name}</p>
            </div>
            
            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Calendar Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-300 text-sm mb-3">Add to your calendar:</p>
              <CalendarButtons
                event={{
                  title: event.title,
                  description: event.description || '',
                  location: displayLocation || '',
                  startTime: event.startTime || event.startDate,
                  endTime: event.endTime || event.endDate || event.startDate,
                  url: typeof window !== 'undefined' ? window.location.href : ''
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Guest Experience */}
        <GuestPrompt
          type="event"
          title={event.title}
          creator={event.creator.name}
          attendees={event.counts?.rsvps || 0}
          startTime={event.startTime || event.startDate}
          location={displayLocation}
          onSignInClick={handleSignInClick}
          className="mb-6"
        />

        {/* Enhanced Share Button */}
        <div className="flex justify-center">
          <EnhancedShareButton
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={event.title}
            description={event.description}
            image={event.image}
            type="event"
            startTime={event.startTime || event.startDate}
            endTime={event.endTime || event.endDate}
            location={displayLocation}
            creator={event.creator.name}
            attendees={event.counts?.rsvps || 0}
            price={event.price !== undefined ? formatPrice(event.price) : undefined}
            category={event.category}
            privacyLevel={event.privacyLevel}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          />
        </div>

        {/* Privacy Notice */}
        {event.privacyLevel !== 'PUBLIC' && (
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm">
              {sharingService.getPrivacyMessage(event.privacyLevel)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}




