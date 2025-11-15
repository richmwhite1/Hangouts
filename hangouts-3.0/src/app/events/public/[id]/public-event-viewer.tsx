'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  DollarSign,
  Share2,
  Heart,
  Plus,
  ArrowLeft,
  User,
  Tag
} from 'lucide-react'
import { format } from 'date-fns'
import { logger } from '@/lib/logger'
import { ShareModal } from '@/components/sharing/share-modal'

interface EventData {
  id: string
  title: string
  description?: string
  venue?: string
  city?: string
  startTime: string
  endTime?: string
  image?: string
  price?: number
  category?: string
  tags?: string[]
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  participants: Array<{
    id: string
    userId: string
    role: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
  }>
  _count: {
    participants: number
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export function PublicEventViewer({ params }: Props) {
  const [event, setEvent] = useState<EventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { id } = await params
        setIsLoading(true)
        const response = await fetch(`/api/events/public/${id}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setEvent(data.event)
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
        logger.error('Error fetching event:', error)
        setError('Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [params])

  const handleSignIn = () => {
    router.push('/signin')
  }

  const handleSignUp = () => {
    router.push('/signup')
  }

  const handleShare = async () => {
    if (!event) return

    const shareUrl = `${window.location.origin}/events/public/${event.id}`
    const invitationText = `Hey, are you interested in ${event.title}?`
    const shareText = `${invitationText}\n\n${event.description || 'Join us for this amazing event!'}\n\nWhen: ${formatDate(event.startTime)}\nWhere: ${event.venue || 'TBD'}${event.city ? `, ${event.city}` : ''}\nPrice: ${formatPrice(event.price)}\n\n${shareUrl}`

    // Check if native sharing is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: invitationText,
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
        logger.error('Failed to copy to clipboard:', error)
        // Final fallback: show the URL
        prompt('Copy this link to share:', shareUrl)
      }
    }
  }

  const handleAddToCalendar = () => {
    if (!event) return

    const startDate = new Date(event.startTime)
    const endDate = event.endTime ? new Date(event.endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const title = event.title
    const description = event.description || ''
    const location = event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ''}` : ''
    const start = formatDate(startDate)
    const end = formatDate(endDate)

    // Create .ics file content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hangouts 3.0//Event//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@hangouts3.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    // Create and download the file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'Free'
    return `$${price}`
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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'This event is private or friends-only.'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleSignIn} className="bg-blue-600 hover:bg-blue-700">
              Sign In
            </Button>
            <Button onClick={handleSignUp} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-b border-gray-800">
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
            <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-400/30">
              Public Event
            </Badge>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(event.startTime)}</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.venue}{event.city && `, ${event.city}`}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>{formatPrice(event.price)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{event._count.participants} interested</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSignIn}
            >
              <Heart className="w-5 h-5 mr-2" />
              RSVP to Event
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={handleAddToCalendar}
            >
              <Calendar className="w-5 h-5 mr-2" />
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
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Image */}
            {event.image && (
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            {event.description && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 whitespace-pre-wrap">{event.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Event Details */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Date & Time</p>
                    <p className="text-gray-300">
                      {formatDate(event.startTime)}
                      {event.startTime && ` at ${formatTime(event.startTime)}`}
                    </p>
                    {event.endTime && (
                      <p className="text-sm text-gray-400">
                        Ends: {formatDate(event.endTime)}
                        {event.endTime && ` at ${formatTime(event.endTime)}`}
                      </p>
                    )}
                  </div>
                </div>

                {event.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Location</p>
                      <p className="text-gray-300">{event.venue}</p>
                      {event.city && (
                        <p className="text-sm text-gray-400">{event.city}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Price</p>
                    <p className="text-gray-300">{formatPrice(event.price)}</p>
                  </div>
                </div>

                {event.category && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Category</p>
                      <p className="text-gray-300 capitalize">{event.category}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="bg-gray-700 text-gray-300 border-gray-600"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    {event.creator.avatar ? (
                      <img 
                        src={event.creator.avatar} 
                        alt={event.creator.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{event.creator.name}</p>
                    <p className="text-sm text-gray-400">@{event.creator.username}</p>
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
                    <span>{event._count.participants} people interested</span>
                  </div>
                  
                  {event.participants.length > 0 && (
                    <div className="space-y-2">
                      {event.participants.slice(0, 5).map((participant) => (
                        <div key={participant.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                            {participant.user.avatar ? (
                              <img 
                                src={participant.user.avatar} 
                                alt={participant.user.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm text-gray-300">{participant.user.name}</span>
                        </div>
                      ))}
                      {event.participants.length > 5 && (
                        <p className="text-sm text-gray-400">
                          +{event.participants.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sign Up Prompt */}
            <Card className="bg-gradient-to-br from-green-600/20 to-blue-600/20 border-green-400/30">
              <CardHeader>
                <CardTitle className="text-white">Want to join this event?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Sign up to RSVP, get updates, and connect with other attendees!
                </p>
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSignIn}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    RSVP Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 text-white hover:bg-gray-700"
                    onClick={handleSignUp}
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
      {event && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={`${window.location.origin}/events/public/${event.id}`}
          title={event.title}
          description={event.description || ''}
          type="event"
          startTime={event.startTime}
          {...(event.endTime && { endTime: event.endTime })}
          {...(event.venue && { venue: event.venue })}
          {...(event.city && { city: event.city })}
          {...(event.price !== undefined && { price: event.price })}
          {...(event.image && { image: event.image })}
        />
      )}
    </div>
  )
}
