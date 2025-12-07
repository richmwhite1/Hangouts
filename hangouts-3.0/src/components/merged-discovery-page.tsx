'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVisualFeedback } from '@/hooks/use-visual-feedback'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Music,
  Coffee,
  Sun,
  Heart as HealthIcon,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { CreateEventModal } from '@/components/events/CreateEventModal'
import { TileActions } from '@/components/ui/tile-actions'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { Loader2 } from 'lucide-react'
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
  endDate?: string
  endTime?: string
  price: {
    min: number
    max?: number
    currency: string
  }
  coverImage: string
  tags: string[]
  creator: {
    id: string
    username: string
    name: string
    avatar: string
  }
  saveCount: number
  createdAt: string
  latitude?: number
  longitude?: number
}
interface Hangout {
  id: string
  title: string
  description: string
  activity: string
  location: string
  date: string
  time: string
  image?: string
  participants: any[]
  photos: any[]
  polls: any[]
  creator: {
    id: string
    username: string
    name: string
    avatar: string
  }
  createdAt: string
  latitude?: number
  longitude?: number
}
const categories = [
  { id: 'all', label: 'All', icon: TrendingUp },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'food', label: 'Food & Drink', icon: Coffee },
  { id: 'entertainment', label: 'Entertainment', icon: Music },
  { id: 'outdoor', label: 'Outdoor', icon: Sun },
  { id: 'wellness', label: 'Wellness', icon: HealthIcon },
]
export function MergedDiscoveryPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState(() => 'coming-up')
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [mergedContent, setMergedContent] = useState<any[]>([])
  const [showPastContent, setShowPastContent] = useState(false)
  const [hasMoreContent, setHasMoreContent] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  // Location filtering state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Visual feedback
  const { showSuccess, showError, showLoading } = useVisualFeedback()

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        },
        { timeout: 10000, enableHighAccuracy: false }
      )
    }
  }, [])

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch events
  const fetchEvents = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('includePast', showPastContent ? 'true' : 'false')
      params.append('page', String(pageNum))
      params.append('limit', '50') // Increased from default

      // Use public API for non-authenticated users
      const apiEndpoint = isSignedIn ? '/api/events' : '/api/public/content'

      if (!isSignedIn) {
        params.append('type', 'EVENT')
        params.append('privacyLevel', 'PUBLIC')
      }

      const response = await fetch(`${apiEndpoint}?${params}`)
      if (response.ok) {
        const data = await response.json()
        const newEvents = isSignedIn ? (data.events || []) : (
          (data.events || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description || '',
            category: 'OTHER', // Default category
            venue: item.venue || '',
            address: '',
            city: item.city || '',
            startDate: item.startTime ? new Date(item.startTime).toISOString().split('T')[0] : '',
            startTime: item.startTime ? new Date(item.startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '',
            endDate: item.endTime ? new Date(item.endTime).toISOString().split('T')[0] : undefined,
            endTime: item.endTime ? new Date(item.endTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : undefined,
            price: {
              min: item.priceMin || 0,
              max: item.priceMax,
              currency: 'USD'
            },
            coverImage: item.image || '',
            tags: [],
            creator: {
              id: item.creatorId || '',
              username: item.creator?.username || '',
              name: item.creator?.name || '',
              avatar: item.creator?.avatar || ''
            },
            saveCount: 0,
            createdAt: item.createdAt,
            latitude: item.latitude,
            longitude: item.longitude
          }))
        )
        
        if (append) {
          setEvents(prev => [...prev, ...newEvents])
        } else {
          setEvents(newEvents)
        }
      }
    } catch (error) {
      logger.error('Error fetching events:', error);
    }
  }
  // Handle refresh
  const handleRefresh = async () => {
    showLoading('Refreshing content...')
    try {
      setPage(1)
      await Promise.all([fetchHangouts(1, false), fetchEvents(1, false)])
      showSuccess('Content refreshed!')
    } catch (error) {
      showError('Failed to refresh content')
    }
  }
  
  // Load more content for infinite scroll
  const loadMoreContent = async () => {
    if (loadingMore || !hasMoreContent) return
    
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    
    try {
      await Promise.all([
        fetchHangouts(nextPage, true),
        fetchEvents(nextPage, true)
      ])
      
      // Check if we got less than a full page - if so, no more content
      // This is a simple check - in production you'd get this from API response
      if (events.length + hangouts.length < nextPage * 50) {
        setHasMoreContent(false)
      }
    } catch (error) {
      logger.error('Error loading more content:', error)
    } finally {
      setLoadingMore(false)
    }
  }
  // Handle ZIP code submission

  // Fetch hangouts
  const fetchHangouts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      // Use public API for non-authenticated users
      const apiEndpoint = isSignedIn ? '/api/discover' : '/api/public/content'
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('includePast', showPastContent ? 'true' : 'false')
      params.append('page', String(pageNum))
      params.append('limit', '50') // Increased from default
      
      if (!isSignedIn) {
        params.append('type', 'HANGOUT')
        params.append('privacyLevel', 'PUBLIC')
      }

      const response = await fetch(`${apiEndpoint}?${params}`)
      if (response.ok) {
        const data = await response.json()
        let hangoutsData = []

        if (isSignedIn) {
          hangoutsData = data.data?.hangouts || data.hangouts || []
        } else {
          // For non-authenticated users, use the hangouts array from public API
          hangoutsData = data.hangouts || []
        }

        // Map the API data to our interface
        const mappedHangouts = hangoutsData.map((hangout: any) => ({
          id: hangout.id,
          title: hangout.title,
          description: hangout.description,
          activity: hangout.title, // Use title as activity for now
          location: hangout.location,
          date: hangout.startTime ? new Date(hangout.startTime).toISOString().split('T')[0] : '',
          time: hangout.startTime ? new Date(hangout.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) : '',
          endTime: hangout.endTime ? new Date(hangout.endTime).toISOString() : undefined,
          image: hangout.image,
          participants: hangout.content_participants || hangout._count?.participants || [],
          photos: [], // Will be fetched separately if needed
          polls: [], // Will be fetched separately if needed
          creator: hangout.users || hangout.creator || {
            id: '',
            username: '',
            name: '',
            avatar: ''
          },
          createdAt: hangout.createdAt,
          latitude: hangout.latitude,
          longitude: hangout.longitude
        }))
        
        if (append) {
          setHangouts(prev => [...prev, ...mappedHangouts])
        } else {
          setHangouts(mappedHangouts)
        }
      }
    } catch (error) {
      logger.error('Error fetching hangouts:', error);
    }
  }
  // Filter content based on all filter criteria
  const filterContent = useCallback((content: any[]) => {
    return content.filter(item => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = item.title?.toLowerCase().includes(query)
        const matchesDesc = item.description?.toLowerCase().includes(query)
        const matchesVenue = item.venue?.toLowerCase().includes(query)

        if (!matchesTitle && !matchesDesc && !matchesVenue) {
          return false
        }
      }

      // Filter by category
      return true
    })
  }, [searchQuery])
  // Merge and sort content (memoized)
  const mergeAndSortContent = useMemo(() => {
    const now = Date.now()
    const allContent = [
      ...events.map(event => {
        const startDate = new Date(event.startDate)
        const endDate = event.endDate ? new Date(event.endDate) : null
        // An event is past only if it has ended (endTime < now, or if no endTime, startTime < now)
        const isPast = endDate
          ? endDate.getTime() < now
          : startDate.getTime() < now

        return {
          ...event,
          type: 'event',
          sortDate: startDate,
          isPast,
          sortPrice: event.price.min,
          sortDistance: userLocation && event.latitude && event.longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
            : Infinity
        }
      }),
      ...hangouts.map(hangout => {
        const hangoutDate = new Date(hangout.date)
        // For hangouts, check if there's an endTime in the original data
        // If hangout has endTime, use it; otherwise use startTime
        const hangoutEndTime = (hangout as any).endTime ? new Date((hangout as any).endTime) : null
        const isPast = hangoutEndTime
          ? hangoutEndTime.getTime() < now
          : hangoutDate.getTime() < now

        return {
          ...hangout,
          type: 'hangout',
          sortDate: hangoutDate,
          isPast,
          sortPrice: 0,
          sortDistance: userLocation && hangout.latitude && hangout.longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, hangout.latitude, hangout.longitude)
            : Infinity
        }
      })
    ]
    // Apply filtering first
    const filteredContent = filterContent(allContent)
    // Apply sorting
    let sortedContent = [...filteredContent]
    switch (sortBy) {
      case 'closest':
        sortedContent.sort((a, b) => a.sortDistance - b.sortDistance)
        break
      case 'coming-up':
        sortedContent.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        break
      case 'newest':
        sortedContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'popular':
        sortedContent.sort((a, b) => (b.saveCount || b.participants?.length || 0) - (a.saveCount || a.participants?.length || 0))
        break
      case 'distance':
        sortedContent.sort((a, b) => a.sortDistance - b.sortDistance)
        break
      case 'date-asc':
        sortedContent.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        break
      case 'date-desc':
        sortedContent.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
        break
      case 'price-low':
        sortedContent.sort((a, b) => a.sortPrice - b.sortPrice)
        break
      case 'price-high':
        sortedContent.sort((a, b) => b.sortPrice - a.sortPrice)
        break
    }
    const enrichedContent = sortedContent.map(item => ({
      ...item,
      isPast: typeof item.isPast === 'boolean' ? item.isPast : item.sortDate.getTime() < now
    }))
    return enrichedContent
  }, [events, hangouts, filterContent, sortBy, userLocation])
  // Update merged content when mergeAndSortContent changes
  useEffect(() => {
    setMergedContent(mergeAndSortContent)
  }, [mergeAndSortContent])
  // Handle URL search parameters
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search')
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery)
    }
  }, [searchParams])


  useEffect(() => {
    // Wait for authentication to load before fetching data
    if (!isLoaded) return

    // Always fetch data, but for non-authenticated users, only fetch public content
    setIsLoading(true)
    setPage(1)
    Promise.all([
      fetchEvents(1, false),
      fetchHangouts(1, false)
    ]).finally(() => {
      setIsLoading(false)
    })
  }, [isSignedIn, isLoaded, showPastContent])
  
  useEffect(() => {
    // Wait for authentication to load before refetching data
    if (!isLoaded) return

    // Refetch both events and hangouts when filters change
    setPage(1)
    setHasMoreContent(true)
    Promise.all([fetchEvents(1, false), fetchHangouts(1, false)])
  }, [searchQuery, showPastContent, isLoaded])
  // Handle zip code geocoding

  const formatPrice = (price: Event['price']) => {
    if (price.min === 0) return 'Free'
    if (price.max && price.max !== price.min) {
      return `$${price.min}-${price.max}`
    }
    return `$${price.min}`
  }
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }
  const getCategoryIcon = (category: string) => {
    const categoryObj = categories.find(cat => cat.id === category)
    return categoryObj ? categoryObj.icon : TrendingUp
  }
  const renderEventCard = (event: Event & { isPast?: boolean }) => {
    const CategoryIcon = getCategoryIcon(event.category)
    const distance = userLocation && event.latitude && event.longitude
      ? calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
      : null
    return (
      <Link href={`/event/${event.id}`} key={`event-${event.id}`}>
        <div className="relative w-full h-80 bg-gray-700 overflow-hidden hover:scale-[1.02] transition-transform duration-300 cursor-pointer group rounded-2xl shadow-xl">
          {/* Event Image - full width */}
          <OptimizedImage
            src={event.coverImage}
            alt={event.title}
            className="w-full h-full object-cover"
            placeholder="/placeholder-event.jpg"
            sizes="100vw"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          {/* Distance Indicator - Top Right */}
          {distance && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center text-white text-sm bg-black/80 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/20">
                <MapPin className="w-3 h-3 mr-1" />
                {distance.toFixed(1)}mi away
              </div>
            </div>
          )}
          {/* Type Badge - Top Left - More Discreet */}
          <div className="absolute top-4 left-4 space-y-2">
            <Badge className="bg-black/60 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20 flex items-center">
              <CategoryIcon className="w-3 h-3 mr-1" />
              Event
            </Badge>
            {/* Price Badge - Under Type Badge - More Discreet */}
            {event.price && event.price.min > 0 && (
              <Badge className="bg-black/60 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20 flex items-center">
                <DollarSign className="w-3 h-3 mr-1" />
                {formatPrice(event.price)}
              </Badge>
            )}
          </div>
          {event.isPast && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-red-600/80 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20 uppercase">
                Past
              </Badge>
            </div>
          )}
          {/* Date - Top Right (if no distance) */}
          {!distance && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center text-white text-sm bg-black/80 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/20">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(event.startDate)}
              </div>
            </div>
          )}
          {/* Title Area - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-6">
            <h3 className="font-bold text-white text-xl line-clamp-2 drop-shadow-lg mb-2 leading-tight">
              {event.title}
            </h3>
            <p className="text-gray-200 text-base line-clamp-1 mb-1">
              {event.venue && `${event.venue} • `}{formatDate(event.startDate)}
            </p>
            {distance && (
              <p className="text-gray-300 text-sm">
                {distance.toFixed(1)} miles away
              </p>
            )}
          </div>
          {/* Action Buttons - Bottom Right */}
          <div className="absolute bottom-4 right-4">
            <TileActions
              itemId={event.id}
              itemType="event"
              onSave={() => {
                // TODO: Implement save functionality
                // console.log('Save event:', id, type); // Removed for production
              }}
              onUnsave={() => {
                // TODO: Implement unsave functionality
                // console.log('Unsave event:', id, type); // Removed for production
              }}
            />
          </div>
        </div>
      </Link>
    )
  }
  const renderHangoutCard = (hangout: Hangout & { isPast?: boolean }) => {
    const distance = userLocation && hangout.latitude && hangout.longitude
      ? calculateDistance(userLocation.lat, userLocation.lng, hangout.latitude, hangout.longitude)
      : null
    return (
      <Link href={`/hangout/${hangout.id}`} key={`hangout-${hangout.id}`}>
        <div className="relative w-full h-80 bg-gray-700 overflow-hidden hover:scale-[1.02] transition-transform duration-300 cursor-pointer group rounded-2xl shadow-xl">
          {/* Hangout Image - full width */}
          <OptimizedImage
            src={hangout.image || '/placeholder-hangout.jpg'}
            alt={hangout.title || hangout.activity}
            className="w-full h-full object-cover"
            placeholder="/placeholder-hangout.jpg"
            sizes="100vw"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          {/* Distance Indicator - Top Right */}
          {distance && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center text-white text-sm bg-black/80 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/20">
                <MapPin className="w-3 h-3 mr-1" />
                {distance.toFixed(1)}mi away
              </div>
            </div>
          )}
          {/* Type Badge - Top Left - More Discreet */}
          <div className="absolute top-4 left-4 space-y-2">
            <Badge className="bg-black/60 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20 flex items-center">
              <Users className="w-3 h-3 mr-1" />
              Hangout
            </Badge>
            {/* Participants Count - Under Type Badge - More Discreet */}
            <Badge className="bg-black/60 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20 flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {hangout.participants?.length || 0}
            </Badge>
          </div>
          {hangout.isPast && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-red-600/80 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20 uppercase">
                Past
              </Badge>
            </div>
          )}
          {/* Date - Top Right (if no distance) */}
          {!distance && (
            <div className="absolute top-4 right-4">
              <div className="flex items-center text-white text-sm bg-black/80 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/20">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(hangout.date)}
              </div>
            </div>
          )}
          {/* Title Area - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-6">
            <h3 className="font-bold text-white text-xl line-clamp-2 drop-shadow-lg mb-2 leading-tight">
              {hangout.title || hangout.activity}
            </h3>
            <p className="text-gray-200 text-base line-clamp-1 mb-1">
              {hangout.location && `${hangout.location} • `}{formatDate(hangout.date)}
            </p>
            {distance && (
              <p className="text-gray-300 text-sm">
                {distance.toFixed(1)} miles away
              </p>
            )}
          </div>
          {/* Action Buttons - Bottom Right */}
          <div className="absolute bottom-4 right-4">
            <TileActions
              itemId={hangout.id}
              itemType="hangout"
              onSave={() => {
                // TODO: Implement save functionality
                // console.log('Save hangout:', id, type); // Removed for production
              }}
              onUnsave={() => {
                // TODO: Implement unsave functionality
                // console.log('Unsave hangout:', id, type); // Removed for production
              }}
            />
          </div>
        </div>
      </Link>
    )
  }
  // Remove authentication requirement for viewing public content
  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-white mb-4">Please sign in to discover events and hangouts</h1>
  //         <p className="text-gray-400">Sign in to explore amazing activities and connect with friends</p>
  //       </div>
  //     </div>
  //   )
  // }
  // Show public content for non-authenticated users with subtle guest landing
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black">
        {/* Subtle Guest Landing Banner */}
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Discover Amazing Events & Hangouts
              </h1>
              <p className="text-gray-300 mb-4">
                Browse public events and hangouts. Sign up to create your own!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    window.location.href = '/signup'
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700"
                  onClick={() => {
                    window.location.href = '/signin'
                  }}
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Public Content Display */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Public Events & Hangouts</h2>
            <p className="text-gray-400">Discover what's happening in your community</p>
          </div>

          {/* Show loading state */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="h-48 bg-gray-700 rounded-lg mb-4" />
                  <div className="h-4 bg-gray-700 rounded mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show public events and hangouts */}
              {(() => {
                const filteredEvents = filterContent(events)
                const filteredHangouts = filterContent(hangouts)
                return filteredEvents.length === 0 && filteredHangouts.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No public events found</h3>
                    <p className="text-gray-400 mb-4">Check back later for new events and hangouts!</p>
                  </div>
                ) : (
                  <>
                    {/* Public Events */}
                    {filteredEvents.map(event => (
                      <Link key={event.id} href={`/events/public/${event.id}`}>
                        <div className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                          <div className="relative h-48 bg-gray-700">
                            <img
                              src={event.coverImage}
                              alt={event.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                if (nextElement) {
                                  nextElement.style.display = 'flex'
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-gray-600 flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
                              <Calendar className="w-12 h-12" />
                            </div>
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-green-600/80 text-white text-xs px-2 py-1">
                                Event
                              </Badge>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-white text-lg mb-2 line-clamp-2">
                              {event.title}
                            </h3>
                            <div className="flex items-center text-gray-300 text-sm mb-1">
                              <Calendar className="w-4 h-4 mr-2" />
                              {formatDate(event.startDate)} at {event.startTime}
                            </div>
                            <div className="flex items-center text-gray-300 text-sm mb-1">
                              <MapPin className="w-4 h-4 mr-2" />
                              {event.venue}, {event.city}
                            </div>
                            <div className="flex items-center text-gray-300 text-sm">
                              <DollarSign className="w-4 h-4 mr-2" />
                              {event.price.min === 0 ? 'Free' : `$${event.price.min}`}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}

                    {/* Public Hangouts */}
                    {filteredHangouts.map(hangout => (
                      <Link key={hangout.id} href={`/hangouts/public/${hangout.id}`}>
                        <div className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                          <div className="relative h-48 bg-gray-700">
                            {hangout.image ? (
                              <img
                                src={hangout.image}
                                alt={hangout.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Users className="w-12 h-12" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-blue-600/80 text-white text-xs px-2 py-1">
                                Hangout
                              </Badge>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-white text-lg mb-2 line-clamp-2">
                              {hangout.title}
                            </h3>
                            <div className="flex items-center text-gray-300 text-sm mb-1">
                              <Calendar className="w-4 h-4 mr-2" />
                              {formatDate(hangout.date)} at {hangout.time}
                            </div>
                            <div className="flex items-center text-gray-300 text-sm mb-1">
                              <MapPin className="w-4 h-4 mr-2" />
                              {hangout.location}
                            </div>
                            <div className="flex items-center text-gray-300 text-sm">
                              <Users className="w-4 h-4 mr-2" />
                              {hangout.participants.length} going
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Discover</h1>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events, hangouts, venues, or tags..."
              className="pl-10 bg-gray-800 border-gray-700 text-white min-h-[44px] text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">All</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-blue-600">Events</TabsTrigger>
            <TabsTrigger value="hangouts" className="data-[state=active]:bg-blue-600">Hangouts</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-blue-600">Saved</TabsTrigger>
          </TabsList>
          {/* Minimal Sort and Filter Controls - Single Line */}
          <div className="flex items-center gap-1.5 mt-2 text-xs overflow-x-auto">
            {isMounted ? (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 w-20 bg-gray-800 border-gray-700 text-gray-300 text-xs focus:ring-0 px-1.5">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="closest" className="text-white hover:bg-gray-700 text-xs">Distance</SelectItem>
                  <SelectItem value="coming-up" className="text-white hover:bg-gray-700 text-xs">Date</SelectItem>
                  <SelectItem value="newest" className="text-white hover:bg-gray-700 text-xs">Newest</SelectItem>
                  <SelectItem value="popular" className="text-white hover:bg-gray-700 text-xs">Popular</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-7 w-20 bg-gray-800 border border-gray-700 rounded-md flex items-center justify-center">
                <span className="text-gray-300 text-xs">Sort</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPastContent(prev => !prev)}
              className="h-7 bg-gray-800 border-gray-700 text-gray-300 text-xs hover:bg-gray-700 px-2 whitespace-nowrap flex-shrink-0"
            >
              {showPastContent ? 'Hide past' : 'Past'}
            </Button>
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-xs truncate max-w-[80px]">
              {userLocation ? 'Current Location' : 'Detecting...'}
            </span>
          </div>
        </Tabs>
      </div>
      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-full h-64 bg-gray-700 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (() => {
            // Display merged content
            const displayContent = mergedContent

            if (displayContent.length === 0) {
              return (
                <div className="text-center py-16 px-4">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                      <TrendingUp className="w-10 h-10 text-[#60A5FA]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {searchQuery ? 'No results found' : 'No content yet'}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {searchQuery
                        ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                        : 'Be the first to create an event or hangout and start connecting with friends!'}
                    </p>
                    {!searchQuery && (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <CreateEventModal />
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            const filteredByTab = displayContent.filter(item => {
              if (activeTab === 'events') return item.type === 'event' || item.type === 'EVENT'
              if (activeTab === 'hangouts') return item.type === 'hangout' || item.type === 'HANGOUT'
              if (activeTab === 'saved') return false // TODO: Implement saved items
              return true // 'all' tab
            })

            const renderCards = (items: any[]) =>
              items.map(item =>
                (item.type === 'event' || item.type === 'EVENT')
                  ? renderEventCard(item as Event & { isPast?: boolean })
                  : renderHangoutCard(item as Hangout & { isPast?: boolean })
              )

            const upcomingItems = filteredByTab.filter(item => !item.isPast)
            const pastItems = filteredByTab.filter(item => item.isPast)

            return (
              <>
                <div className="space-y-3 px-4">
                  {upcomingItems.length > 0 ? renderCards(upcomingItems) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No upcoming events match these filters.
                    </div>
                  )}
                  {showPastContent && pastItems.length > 0 && (
                    <>
                      <div className="sticky top-16 z-0 bg-black/80 backdrop-blur py-3 text-center text-xs uppercase tracking-wide text-gray-400 border-t border-gray-800">
                        Past events and hangouts
                      </div>
                      {renderCards(pastItems)}
                    </>
                  )}
                </div>
                
                {/* Load More Button */}
                {hasMoreContent && upcomingItems.length > 0 && (
                  <div className="flex justify-center py-6 px-4">
                    <Button
                      onClick={loadMoreContent}
                      disabled={loadingMore}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
                
                {!hasMoreContent && upcomingItems.length > 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    You've seen all available content
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </PullToRefresh>
    </div>
  )
}