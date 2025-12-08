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
  ArrowRight,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { PWAInstallBanner } from '@/components/pwa-install-banner'
import { SocialProofCounter } from '@/components/social-proof-counter'
import { BeforeAfterComparison } from '@/components/before-after-comparison'
import { AppDemoVisual } from '@/components/marketing/app-demo-visual'
import { TrustSection } from '@/components/marketing/trust-section'
import { LiveActivityFeed } from '@/components/marketing/live-activity-feed'

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
      color: "text-blue-500"
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
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/10 via-transparent to-purple-600/10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight" style={{ fontFamily: 'var(--font-oswald)' }}>
              Group Plans That<br />Actually Happen
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Create hangouts, friends vote, everyone knows the plan.<br className="hidden md:block" />
              <span className="text-[#FF1493] font-semibold">In 30 seconds.</span>
            </p>

            {/* Social Proof Counter */}
            <SocialProofCounter className="mb-8" />
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button
                size="lg"
                className="bg-[#FF1493] hover:bg-[#E01180] text-white px-12 py-6 text-xl font-bold shadow-2xl shadow-[#FF1493]/50 transition-all hover:scale-105 hover:shadow-[#FF1493]/70 rounded-xl"
                onClick={onSignUp}
              >
                Create Your First Hangout
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 mb-2">
              Free forever · No credit card · 2 minute setup
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Already have an account?{' '}
              <button onClick={onSignIn} className="text-[#FF1493] hover:text-[#E01180] underline font-medium">
                Sign in
              </button>
            </p>

            {/* App Demo Visual */}
            <AppDemoVisual />
            
            {/* PWA Install Prompt */}
            <PWAInstallBanner variant="hero" showForAllUsers={true} />
          </div>
        </div>
      </div>

      {/* Visual Comparison Section */}
      <BeforeAfterComparison />

      {/* How It Works Section - Visual Steps */}
      <div className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-oswald)' }}>
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Three simple steps. Zero chaos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create in 30 seconds',
                description: 'Suggest times, places, or let friends decide',
                icon: Calendar,
                color: '#FF1493'
              },
              {
                step: '2',
                title: 'Friends vote instantly',
                description: 'Everyone votes, no back-and-forth needed',
                icon: Users,
                color: '#8B5CF6'
              },
              {
                step: '3',
                title: 'Plans finalized automatically',
                description: 'Majority decides, calendars update, done',
                icon: CheckCircle,
                color: '#10B981'
              }
            ].map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={index}
                  className="group relative text-center hover:scale-105 transition-transform duration-300"
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg z-10">
                    {step.step}
                  </div>
                  
                  {/* Card */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-8 h-full hover:border-[#FF1493]/30 transition-all duration-300">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-black/50 flex items-center justify-center mb-6 border border-gray-700 group-hover:border-[#FF1493]/50 transition-all" style={{ backgroundColor: `${step.color}15` }}>
                      <Icon className="h-10 w-10" style={{ color: step.color }} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-gray-400 text-lg leading-relaxed">{step.description}</p>
                  </div>
                  
                  {/* Connecting arrow */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-0">
                      <ArrowRight className="w-12 h-12 text-[#FF1493]/30" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Live Content Preview Section */}
      <div className="py-24 bg-gradient-to-b from-black via-gray-950 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-oswald)' }}>
              Happening Right Now
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Real hangouts and events from people like you
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
                <Card key={hangout.id} className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-[#FF1493]/30 transition-all duration-300 overflow-hidden group hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#FF1493]/20">
                  {/* Primary Photo */}
                  {hangout.image && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={hangout.image}
                        alt={hangout.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-[#FF1493]/90 text-white border-0 backdrop-blur-sm">
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
                        className="flex-1 bg-[#FF1493] hover:bg-[#E01180] text-white font-semibold"
                        onClick={onSignIn}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Join Hangout
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
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
                <Card key={event.id} className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-purple-500/30 transition-all duration-300 overflow-hidden group hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">
                  {/* Primary Photo */}
                  {event.image && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-purple-600/90 text-white border-0 backdrop-blur-sm">
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
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                        onClick={onSignIn}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Save Event
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
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
              size="lg"
              className="border-2 border-[#FF1493]/30 text-white hover:bg-[#FF1493]/10 bg-black/50 backdrop-blur-sm px-8"
              onClick={() => window.location.href = '/public-discover'}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Discover More Events & Hangouts
            </Button>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
              Everything You Need
            </h2>
            <p className="text-xl text-gray-400">
              Make plans that actually happen
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493]/20 to-purple-600/20 border border-[#FF1493]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-5 w-5 text-[#FF1493]" />
                  </div>
                  <span className="text-gray-300 text-lg leading-relaxed pt-1.5">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-gradient-to-br from-[#FF1493]/10 via-purple-600/10 to-transparent border border-[#FF1493]/20 rounded-3xl p-10 backdrop-blur-sm">
              <h3 className="text-3xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                Join thousands making plans that actually stick. Create your first hangout in under 2 minutes.
              </p>
              <Button
                size="lg"
                className="w-full bg-[#FF1493] hover:bg-[#E01180] text-white font-bold py-6 text-xl rounded-xl shadow-2xl shadow-[#FF1493]/50 hover:scale-105 transition-all"
                onClick={onSignUp}
              >
                Create Your First Hangout
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
              <p className="text-center text-sm text-gray-500 mt-4">
                Free forever · No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Section */}
      <div className="py-24 bg-gradient-to-b from-black via-gray-950 to-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left side - Activity Feed */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-oswald)' }}>
                Happening Right Now
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Join thousands making plans that actually happen
              </p>
              <LiveActivityFeed />
            </div>

            {/* Right side - Stats */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#FF1493]/10 to-purple-600/10 border border-[#FF1493]/20 rounded-2xl p-8">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
                    2,847
                  </div>
                  <p className="text-xl text-gray-400">Plans created this week</p>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-800">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#FF1493] mb-1">4 min</div>
                    <p className="text-sm text-gray-400">Average decision time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">94%</div>
                    <p className="text-sm text-gray-400">Show-up rate</p>
                  </div>
                </div>
              </div>

              <div className="text-center p-6 bg-black/50 border border-gray-800 rounded-xl">
                <p className="text-gray-400 mb-4 text-lg">
                  "Finally, a way to plan things without the endless back-and-forth!"
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-purple-600" />
                  <div className="text-left">
                    <p className="text-white font-semibold">Sarah M.</p>
                    <p className="text-sm text-gray-500">Brooklyn, NY</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Security Section */}
      <TrustSection />

    </div>
  )
}
