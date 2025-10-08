'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, DollarSign, Users, Clock, Share2, Heart, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { TileActions } from '@/components/ui/tile-actions'
import { EventMeta } from '@/components/seo/event-meta'
import { CalendarButtons } from '@/components/ui/calendar-buttons'

interface Event {
  id: string
  title: string
  description: string
  category: string
  venue: string
  address: string
  city: string
  startDate: string
  startTime: string
  coverImage: string
  price: {
    min: number
    max?: number
    currency: string
  }
  tags: string[]
  attendeeCount: number
  isPublic: boolean
  creator: {
    id: string
    name: string
    username: string
    avatar: string
  }
  createdAt: string
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user, token } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpStatus, setRsvpStatus] = useState<'PENDING' | 'YES' | 'NO' | 'MAYBE' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRsvping, setIsRsvping] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchEvent()
    }
  }, [params.id])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${params.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setEvent(data.data.event)
        } else {
          setError('Event not found')
        }
      } else {
        setError('Event not found')
      }
    } catch (error) {
      console.error('Error fetching event:', error)
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: { min: number; max?: number; currency: string }) => {
    if (price.min === 0) return 'Free'
    if (price.max && price.max !== price.min) {
      return `$${price.min}-${price.max}`
    }
    return `$${price.min}`
  }

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString)
    const time = timeString ? timeString : 'TBD'
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) + (time !== 'TBD' ? ` at ${time}` : '')
  }

  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    if (!isAuthenticated || !token) {
      toast.error('Please sign in to RSVP')
      return
    }

    try {
      setIsRsvping(true)
      const response = await fetch(`/api/events/${params.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setRsvpStatus(status)
        toast.success(`RSVP updated: ${status}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update RSVP')
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
      toast.error('Failed to update RSVP')
    } finally {
      setIsRsvping(false)
    }
  }

  const handleSaveEvent = async () => {
    if (!isAuthenticated || !token) {
      toast.error('Please sign in to save events')
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch(`/api/events/${params.id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setIsSaved(true)
        toast.success('Event saved to your feed!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save event')
      }
    } catch (error) {
      console.error('Error saving event:', error)
      toast.error('Failed to save event')
    } finally {
      setIsSaving(false)
    }
  }


  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: event?.description,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Event link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'This event does not exist or has been removed.'}</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <EventMeta event={event} isPublic={true} />
      <div className="min-h-screen bg-black">
      {/* Event Image */}
      <div className="relative h-64 md:h-96">
        <OptimizedImage
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover"
          placeholder="/placeholder-event.jpg"
          sizes="100vw"
        />
        
        {/* Overlay Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button size="sm" variant="secondary" className="bg-black/50 hover:bg-black/70">
            <Heart className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" className="bg-black/50 hover:bg-black/70" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-purple-600 text-white">
            {event.category}
          </Badge>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-4 space-y-6">
        {/* Title and Description */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{event.title}</h1>
          <p className="text-gray-300 leading-relaxed">{event.description}</p>
        </div>

        {/* Event Info */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center text-gray-300">
              <Calendar className="w-5 h-5 mr-3 text-purple-500" />
              <div>
                <p className="font-medium">{formatDateTime(event.startDate, event.startTime)}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-300">
              <MapPin className="w-5 h-5 mr-3 text-purple-500" />
              <div>
                <p className="font-medium">{event.venue}</p>
                <p className="text-sm text-gray-400">{event.address}, {event.city}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-300">
              <DollarSign className="w-5 h-5 mr-3 text-purple-500" />
              <p className="font-medium">{formatPrice(event.price)}</p>
            </div>
            
            <div className="flex items-center text-gray-300">
              <Users className="w-5 h-5 mr-3 text-purple-500" />
              <p className="font-medium">{event.attendeeCount} attendees</p>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <Badge key={tag} variant="outline" className="bg-gray-700 border-gray-600 text-gray-300">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Creator Info */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <img
                src={event.creator.avatar || '/placeholder-avatar.png'}
                alt={event.creator.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-medium text-white">{event.creator.name}</p>
                <p className="text-sm text-gray-400">@{event.creator.username}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RSVP Section */}
        {isAuthenticated && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Are you going?</h3>
              <div className="flex gap-3">
                <Button
                  variant={rsvpStatus === 'YES' ? 'default' : 'outline'}
                  className={`flex-1 ${
                    rsvpStatus === 'YES' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                  onClick={() => handleRSVP('YES')}
                  disabled={isRsvping}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Going
                </Button>
                <Button
                  variant={rsvpStatus === 'MAYBE' ? 'default' : 'outline'}
                  className={`flex-1 ${
                    rsvpStatus === 'MAYBE' 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                  onClick={() => handleRSVP('MAYBE')}
                  disabled={isRsvping}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Maybe
                </Button>
                <Button
                  variant={rsvpStatus === 'NO' ? 'default' : 'outline'}
                  className={`flex-1 ${
                    rsvpStatus === 'NO' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  }`}
                  onClick={() => handleRSVP('NO')}
                  disabled={isRsvping}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Not Going
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center">
          <TileActions
            itemId={event.id}
            itemType="event"
            itemTitle={event.title}
            itemDescription={event.description || ''}
            itemImage={event.image || ''}
            privacyLevel={event.privacyLevel || 'PUBLIC'}
            isSaved={isSaved}
            onSave={(id, type) => {
              console.log('Save event:', id, type)
            }}
            onUnsave={(id, type) => {
              console.log('Unsave event:', id, type)
            }}
          />
        </div>

        {/* Calendar Buttons for Non-Authenticated Users */}
        {!isAuthenticated && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-white font-medium mb-3 text-center">Add to Calendar</h3>
            <CalendarButtons
              event={{
                title: event.title,
                description: event.description,
                location: event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ''}` : '',
                startTime: event.startDate ? `${event.startDate}T${event.startTime || '00:00'}` : new Date().toISOString(),
                endTime: event.startDate ? `${event.startDate}T${event.startTime || '00:00'}` : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                url: window.location.href
              }}
              className="justify-center"
            />
          </div>
        )}
      </div>

    </div>
    </>
  )
}
