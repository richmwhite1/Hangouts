'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  MapPin, 
  Heart, 
  Share2, 
  Star,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface GuestLandingProps {
  onSignIn: () => void
  onSignUp: () => void
}

interface PublicHangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  image?: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creator: {
    name: string
    username: string
    avatar?: string
  }
  _count: {
    participants: number
  }
}

interface PublicEvent {
  id: string
  title: string
  description?: string
  venue?: string
  city?: string
  startDate: string
  endDate?: string
  image?: string
  price?: number
  creator: {
    name: string
    username: string
    avatar?: string
  }
  _count: {
    participants: number
  }
}

export function GuestLanding({ onSignIn, onSignUp }: GuestLandingProps) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [publicContent, setPublicContent] = useState<{
    hangouts: PublicHangout[]
    events: PublicEvent[]
  }>({ hangouts: [], events: [] })
  const [isLoadingContent, setIsLoadingContent] = useState(true)

  useEffect(() => {
    const fetchPublicContent = async () => {
      try {
        setIsLoadingContent(true)
        const response = await fetch('/api/public/content?limit=6')
        const data = await response.json()
        
        if (data.success) {
          setPublicContent({
            hangouts: data.hangouts || [],
            events: data.events || []
          })
        }
      } catch (error) {
        console.error('Error fetching public content:', error)
      } finally {
        setIsLoadingContent(false)
      }
    }

    fetchPublicContent()
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date TBD'
      }
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return 'Date TBD'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Time TBD'
      }
      return format(date, 'h:mm a')
    } catch (error) {
      return 'Time TBD'
    }
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'Free'
    return `$${price}`
  }

  const features = [
    {
      icon: Users,
      title: "Connect with Friends",
      description: "Create hangouts and invite your friends to join the fun",
      color: "text-blue-500"
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Let everyone vote on the best time and place for your hangout",
      color: "text-green-500"
    },
    {
      icon: Heart,
      title: "Save & Discover",
      description: "Save events you're interested in and discover new ones",
      color: "text-red-500"
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description: "Share hangouts and events with friends instantly",
      color: "text-purple-500"
    }
  ]

  const benefits = [
    "Create unlimited hangouts and events",
    "Invite friends and manage RSVPs",
    "Discover local events and activities",
    "Save events you're interested in",
    "Share with friends and family",
    "Get notifications for your events"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-yellow-400 mr-2" />
              <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                Beta
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Plan Perfect
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {" "}Hangouts
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              The easiest way to coordinate with friends, discover events, and make plans that actually happen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                onClick={onSignUp}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-600 text-white hover:bg-gray-700 px-8 py-3 text-lg"
                onClick={onSignIn}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to plan great hangouts
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              From casual meetups to big events, we make coordination effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card 
                  key={index}
                  className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 cursor-pointer"
                  onClick={() => setCurrentFeature(index)}
                >
                  <CardHeader className="text-center">
                    <div className={`mx-auto w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4 ${
                      currentFeature === index ? 'bg-blue-600' : ''
                    }`}>
                      <Icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Live Content Preview Section */}
      <div className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See What's Happening
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Check out these recent hangouts and events happening right now
            </p>
          </div>

          {isLoadingContent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-full h-64 bg-gray-700 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show hangouts */}
              {publicContent.hangouts.slice(0, 3).map((hangout) => (
                <Card key={hangout.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden">
                  {/* Primary Photo */}
                  {hangout.image && (
                    <div className="relative h-48 w-full">
                      <img
                        src={hangout.image}
                        alt={hangout.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                          Hangout
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white mb-2 line-clamp-1">{hangout.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(hangout.startTime)}</span>
                        </div>
                        {hangout.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span className="line-clamp-1">{hangout.location}</span>
                          </div>
                        )}
                      </div>
                      {!hangout.image && (
                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                          Hangout
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {hangout.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{hangout.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{hangout._count.participants} going</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>by {hangout.creator.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={onSignIn}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Join Hangout
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        onClick={() => window.open(`/hangouts/public/${hangout.id}`, '_blank')}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Show events */}
              {publicContent.events.slice(0, 3).map((event) => (
                <Card key={event.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden">
                  {/* Primary Photo */}
                  {event.image && (
                    <div className="relative h-48 w-full">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-400/30">
                          Event
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white mb-2 line-clamp-1">{event.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.startDate)}</span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span className="line-clamp-1">{event.venue}{event.city && `, ${event.city}`}</span>
                          </div>
                        )}
                      </div>
                      {!event.image && (
                        <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-400/30">
                          Event
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {event.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{event.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{event._count.participants} interested</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-green-400">{formatPrice(event.price)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>by {event.creator.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={onSignIn}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        RSVP
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        onClick={() => window.open(`/events/public/${event.id}`, '_blank')}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoadingContent && publicContent.hangouts.length === 0 && publicContent.events.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No content yet</h3>
              <p className="text-gray-400 mb-4">Be the first to create an event or hangout!</p>
              <Button onClick={onSignUp} className="bg-blue-600 hover:bg-blue-700">
                Create Your First Event
              </Button>
            </div>
          )}

          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={() => window.location.href = '/public-discover'}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Discover More Events & Hangouts
            </Button>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why choose Hangouts 3.0?
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of users who make better plans together
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-lg">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-gray-300 mb-6">
                Sign up now and start planning your first hangout. It's completely free and takes less than a minute.
              </p>
              <Button 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={onSignUp}
              >
                Create Your Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
