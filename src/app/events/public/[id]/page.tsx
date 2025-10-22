'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Head from 'next/head'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  DollarSign,
  Globe,
  Lock,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Share2,
  UserPlus,
  Heart,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
  image?: string
  price: {
    min: number
    max?: number
    currency: string
  }
  tags: string[]
  attendeeCount: number
  isPublic: boolean
  privacyLevel?: string
  creator: {
    id: string
    name: string
    username: string
    avatar: string
  }
  createdAt: string
}

export default function PublicEventPage() {
  const params = useParams()
  const router = useRouter()
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const eventId = params.id as string

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return
      
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch event details
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error('Event not found')
        }
        
        const data = await response.json()
        setCurrentEvent(data.event)
      } catch (err) {
        console.error('Error fetching event:', err)
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const handleShare = async () => {
    if (!currentEvent) return

    const shareUrl = `${window.location.origin}/events/public/${eventId}`
    const shareText = `Come check out ${currentEvent.title} event! Join me for "${currentEvent.title}" at ${currentEvent.venue || 'a great venue'}! ${shareUrl}`

    // Check if native sharing is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentEvent.title,
          text: shareText,
          url: shareUrl
        })
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled or failed:', error)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        // Success - no popup needed
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        // Final fallback: show the URL
        prompt('Copy this link to share:', shareUrl)
      }
    }
  }

  const handleSignIn = () => {
    router.push('/signin')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !currentEvent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {error || 'Event not found'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            This event may have been deleted or is not public
          </p>
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

  const formatTime = (timeString: string) => {
    return timeString
  }

  const formatPrice = (price: { min: number; max?: number; currency: string }) => {
    if (price.min === 0) return 'Free'
    if (price.max && price.max !== price.min) {
      return `${price.currency}${price.min} - ${price.currency}${price.max}`
    }
    return `${price.currency}${price.min}`
  }

  // Generate metadata for rich previews
  const generateMetadata = () => {
    if (!currentEvent) return null

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const eventUrl = `${baseUrl}/events/public/${eventId}`
    const imageUrl = currentEvent.coverImage || currentEvent.image || `${baseUrl}/api/placeholder/1200/630`
    
    const title = `Come check out ${currentEvent.title} event${currentEvent.venue ? ` at ${currentEvent.venue}` : ''}`
    const description = currentEvent.description || 
      `Join ${currentEvent.creator?.name || 'us'} for this ${currentEvent.category?.toLowerCase() || 'event'}${currentEvent.startDate ? ` on ${formatDate(currentEvent.startDate)}` : ''}. Open to everyone!`

    return {
      title,
      description,
      imageUrl,
      eventUrl
    }
  }

  const metadata = generateMetadata()

  return (
    <>
      {metadata && (
        <Head>
          {/* Basic Meta Tags */}
          <title>{metadata.title}</title>
          <meta name="description" content={metadata.description} />
          <meta name="keywords" content={`event, ${currentEvent.category?.toLowerCase()}, ${currentEvent.tags?.join(', ')}, social, meetup, friends, planning, public`} />
          
          {/* Open Graph Meta Tags */}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={metadata.title} />
          <meta property="og:description" content={metadata.description} />
          <meta property="og:url" content={metadata.eventUrl} />
          <meta property="og:image" content={metadata.imageUrl} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={currentEvent?.title} />
          <meta property="og:site_name" content="Hangouts 3.0" />
          
          {/* Twitter Card Meta Tags */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={metadata.title} />
          <meta name="twitter:description" content={metadata.description} />
          <meta name="twitter:image" content={metadata.imageUrl} />
          <meta name="twitter:image:alt" content={currentEvent?.title} />
          
          {/* Additional Meta Tags */}
          <meta name="robots" content="index, follow" />
          <meta name="author" content={currentEvent?.creator?.name || 'Hangouts 3.0'} />
          
          {/* Event Specific Meta Tags */}
          {currentEvent?.startDate && (
            <meta property="event:start_time" content={new Date(currentEvent.startDate).toISOString()} />
          )}
          {currentEvent?.venue && (
            <meta property="event:location" content={`${currentEvent.venue}${currentEvent.city ? `, ${currentEvent.city}` : ''}`} />
          )}
          
          {/* Event Details */}
          {currentEvent?.category && (
            <meta property="event:category" content={currentEvent.category} />
          )}
          <meta property="event:price" content={formatPrice(currentEvent.price)} />
          
          {/* Canonical URL */}
          <link rel="canonical" href={metadata.eventUrl} />
        </Head>
      )}
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
              Event Details
            </h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Hero Section */}
          <Card className="overflow-hidden">
            {(currentEvent.coverImage || currentEvent.image) && (
              <div className="aspect-video bg-gradient-to-r from-blue-500 to-purple-600 relative">
                <img
                  src={currentEvent.coverImage || currentEvent.image}
                  alt={currentEvent.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20" />
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {currentEvent.category}
                    </Badge>
                    {currentEvent.isPublic && (
                      <Badge variant="outline" className="text-xs">
                        Public
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {currentEvent.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(currentEvent.startDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(currentEvent.startTime)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Share2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Venue */}
              {currentEvent.venue && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {currentEvent.venue}
                    </p>
                    {currentEvent.address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentEvent.address}
                        {currentEvent.city && `, ${currentEvent.city}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatPrice(currentEvent.price)}
                  </p>
                </div>
              </div>

              {/* Description */}
              {currentEvent.description && (
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    {currentEvent.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {currentEvent.tags && currentEvent.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentEvent.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Creator */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentEvent.creator.avatar} />
                  <AvatarFallback>
                    {currentEvent.creator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Created by {currentEvent.creator.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{currentEvent.creator.username}
                  </p>
                </div>
              </div>

              {/* Attendee Count */}
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentEvent.attendeeCount} attending
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sign In CTA */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="text-center py-6">
              <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Want to join this event?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Sign in to RSVP, comment, and connect with other attendees!
              </p>
              <Button onClick={handleSignIn} className="w-full">
                Sign In to Join
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}







