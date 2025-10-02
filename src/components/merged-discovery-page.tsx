'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TouchButton } from '@/components/ui/touch-button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useBottomSheet } from '@/components/ui/bottom-sheet'
import { LoadingOverlay } from '@/components/ui/loading-states'
import { useVisualFeedback } from '@/hooks/use-visual-feedback'
import { useCardHover } from '@/hooks/use-micro-interactions'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'
import { PerformanceMonitor } from '@/components/ui/performance-monitor'
import { useCache } from '@/lib/cache'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { SwipeableCard } from '@/components/ui/swipeable-card'
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Heart, 
  Share2, 
  Plus,
  Users,
  Clock,
  Camera,
  Music,
  Coffee,
  Utensils,
  Mountain,
  Dumbbell,
  Gamepad2,
  Palette,
  Building2,
  GraduationCap,
  Heart as HealthIcon,
  Home,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { CreateEventModal } from '@/components/events/CreateEventModal'
import Link from 'next/link'

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
}

const categories = [
  { id: 'all', label: 'All', icon: TrendingUp },
  { id: 'MUSIC', label: 'Music', icon: Music },
  { id: 'SPORTS', label: 'Sports', icon: Dumbbell },
  { id: 'FOOD', label: 'Food', icon: Utensils },
  { id: 'NIGHTLIFE', label: 'Nightlife', icon: Coffee },
  { id: 'ARTS', label: 'Arts', icon: Palette },
  { id: 'OUTDOORS', label: 'Outdoors', icon: Mountain },
  { id: 'TECHNOLOGY', label: 'Technology', icon: Building2 },
  { id: 'BUSINESS', label: 'Business', icon: Building2 },
  { id: 'EDUCATION', label: 'Education', icon: GraduationCap },
  { id: 'HEALTH', label: 'Health', icon: HealthIcon },
  { id: 'FAMILY', label: 'Family', icon: Home },
]

const timeFilters = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
]

const sortOptions = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'date-asc', label: 'Date: Soonest First' },
  { id: 'date-desc', label: 'Date: Latest First' },
  { id: 'distance', label: 'Distance: Closest First' },
]

const distanceOptions = [
  { id: '5', label: '5 miles' },
  { id: '10', label: '10 miles' },
  { id: '25', label: '25 miles' },
  { id: '50', label: '50 miles' },
  { id: '100', label: '100 miles' },
  { id: 'unlimited', label: 'No limit' },
]

export function MergedDiscoveryPage() {
  const { user, token, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [mergedContent, setMergedContent] = useState<any[]>([])
  
  // Comprehensive filtering state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  
  // Location filtering state
  const [zipCode, setZipCode] = useState('')
  const [maxDistance, setMaxDistance] = useState('unlimited')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // Bottom sheet for filters
  const filterBottomSheet = useBottomSheet()
  
  // Visual feedback
  const { showSuccess, showError, showLoading } = useVisualFeedback()
  
  // Performance monitoring
  const { measureAsyncOperation } = usePerformanceMonitor({
    enableMemoryMonitoring: true
  })
  
  // Caching
  const hangoutsCache = useCache('hangouts', () => fetchHangouts(), { ttl: 5 * 60 * 1000 })
  const eventsCache = useCache('events', () => fetchEvents(), { ttl: 5 * 60 * 1000 })

  const commonTags = [
    'concert', 'festival', 'workshop', 'networking', 'charity', 'fundraiser',
    'conference', 'seminar', 'exhibition', 'tournament', 'competition', 'show',
    'party', 'gala', 'dinner', 'lunch', 'brunch', 'meetup', 'social',
    'fitness', 'yoga', 'dance', 'art', 'music', 'theater', 'comedy'
  ]

  // Geocoding function to convert zip code to coordinates
  const geocodeZipCode = async (zip: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Mock geocoding for common US zip codes (for demo purposes)
      const mockZipCodes: { [key: string]: { lat: number; lng: number } } = {
        '10001': { lat: 40.7505, lng: -73.9934 }, // NYC
        '90210': { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
        '60601': { lat: 41.8781, lng: -87.6298 }, // Chicago
        '33101': { lat: 25.7617, lng: -80.1918 }, // Miami
        '98101': { lat: 47.6062, lng: -122.3321 }, // Seattle
        '94102': { lat: 37.7749, lng: -122.4194 }, // San Francisco
        '02101': { lat: 42.3601, lng: -71.0589 }, // Boston
        '75201': { lat: 32.7767, lng: -96.7970 }, // Dallas
        '30309': { lat: 33.7490, lng: -84.3880 }, // Atlanta
        '85001': { lat: 33.4484, lng: -112.0740 }, // Phoenix
      }
      
      if (mockZipCodes[zip]) {
        return mockZipCodes[zip]
      }
      
      // For other zip codes, use a simple approximation based on first 3 digits
      const region = zip.substring(0, 3)
      const baseLat = 39.8283 + (parseInt(region) - 100) * 0.1
      const baseLng = -98.5795 + (parseInt(region) - 100) * 0.1
      
      return {
        lat: baseLat + (Math.random() - 0.5) * 2, // Add some randomness
        lng: baseLng + (Math.random() - 0.5) * 2
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedTimeFilter('all')
    setSelectedTags([])
    setPriceRange({ min: '', max: '' })
    setDateRange({ start: '', end: '' })
    setZipCode('')
    setMaxDistance('unlimited')
    setUserLocation(null)
  }

  // Fetch events
  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      
      // Handle time filters
      if (selectedTimeFilter !== 'all') {
        const now = new Date()
        switch (selectedTimeFilter) {
          case 'today':
            params.append('dateFrom', now.toISOString())
            params.append('dateTo', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
            break
          case 'tomorrow':
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            params.append('dateFrom', tomorrow.toISOString())
            params.append('dateTo', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString())
            break
          case 'this-week':
            params.append('dateFrom', now.toISOString())
            params.append('dateTo', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
            break
          case 'this-month':
            params.append('dateFrom', now.toISOString())
            params.append('dateTo', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
            break
        }
      }
      
      // Handle custom date range
      if (dateRange.start) params.append('dateFrom', new Date(dateRange.start).toISOString())
      if (dateRange.end) params.append('dateTo', new Date(dateRange.end).toISOString())

      const response = await fetch(`/api/events?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    showLoading('Refreshing content...')
    try {
      await Promise.all([fetchHangouts(), fetchEvents()])
      showSuccess('Content refreshed!')
    } catch (error) {
      showError('Failed to refresh content')
    }
  }

  // Fetch hangouts
  const fetchHangouts = async () => {
    try {
      const response = await fetch('/api/discover', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        const hangoutsData = data.data?.hangouts || data.hangouts || []
        
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
          image: hangout.image,
          participants: hangout.content_participants || [],
          photos: [], // Will be fetched separately if needed
          polls: [], // Will be fetched separately if needed
          creator: hangout.users || {
            id: '',
            username: '',
            name: '',
            avatar: ''
          },
          createdAt: hangout.createdAt
        }))
        
        setHangouts(mappedHangouts)
      }
    } catch (error) {
      console.error('Error fetching hangouts:', error)
    }
  }

  // Filter content based on all filter criteria
  const filterContent = useCallback((content: any[]) => {
    return content.filter(item => {
      // Search filter
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.venue && item.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      
      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        (item.tags && selectedTags.some(tag => item.tags.some((itemTag: string) => 
          itemTag.toLowerCase().includes(tag.toLowerCase())
        )))
      
      // Price filter
      const matchesPrice = (!priceRange.min || (item.price && item.price.min >= parseInt(priceRange.min))) &&
                          (!priceRange.max || (item.price && item.price.min <= parseInt(priceRange.max)))
      
      // Date filter
      const itemDate = new Date(item.startDate || item.date)
      const matchesDate = (!dateRange.start || itemDate >= new Date(dateRange.start)) &&
                         (!dateRange.end || itemDate <= new Date(dateRange.end))
      
      // Location filter
      let matchesLocation = true
      if (userLocation && maxDistance !== 'unlimited') {
        const itemLat = item.latitude || item.lat
        const itemLng = item.longitude || item.lng
        if (itemLat && itemLng) {
          const distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            itemLat, 
            itemLng
          )
          matchesLocation = distance <= parseInt(maxDistance)
        } else {
          matchesLocation = false // Hide items without coordinates when location filtering is active
        }
      }
      
      return matchesSearch && matchesCategory && matchesTags && matchesPrice && matchesDate && matchesLocation
    })
  }, [searchQuery, selectedCategory, selectedTags, priceRange, dateRange, userLocation, maxDistance])

  // Merge and sort content (memoized)
  const mergeAndSortContent = useMemo(() => {
    const allContent = [
      ...events.map(event => ({
        ...event,
        type: 'event',
        sortDate: new Date(event.startDate),
        sortPrice: event.price.min,
        sortDistance: userLocation && event.latitude && event.longitude 
          ? calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
          : Infinity
      })),
      ...hangouts.map(hangout => ({
        ...hangout,
        type: 'hangout',
        sortDate: new Date(hangout.date),
        sortPrice: 0,
        sortDistance: userLocation && hangout.latitude && hangout.longitude 
          ? calculateDistance(userLocation.lat, userLocation.lng, hangout.latitude, hangout.longitude)
          : Infinity
      }))
    ]

    // Apply filtering first
    const filteredContent = filterContent(allContent)

    // Apply sorting
    let sortedContent = [...filteredContent]
    switch (sortBy) {
      case 'newest':
        sortedContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        sortedContent.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'popular':
        sortedContent.sort((a, b) => (b.saveCount || b.participants?.length || 0) - (a.saveCount || a.participants?.length || 0))
        break
      case 'price-low':
        sortedContent.sort((a, b) => a.sortPrice - b.sortPrice)
        break
      case 'price-high':
        sortedContent.sort((a, b) => b.sortPrice - a.sortPrice)
        break
      case 'date-asc':
        sortedContent.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        break
      case 'date-desc':
        sortedContent.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
        break
      case 'distance':
        sortedContent.sort((a, b) => a.sortDistance - b.sortDistance)
        break
    }

    return sortedContent
  }, [events, hangouts, filterContent, sortBy, userLocation])

  // Update merged content when mergeAndSortContent changes
  useEffect(() => {
    setMergedContent(mergeAndSortContent)
  }, [mergeAndSortContent])

  useEffect(() => {
    if (isAuthenticated && token) {
      setIsLoading(true)
      Promise.all([fetchEvents(), fetchHangouts()]).finally(() => {
        setIsLoading(false)
      })
    }
  }, [isAuthenticated, token])


  useEffect(() => {
    if (isAuthenticated && token) {
      fetchEvents()
    }
  }, [searchQuery, selectedCategory, selectedTimeFilter, dateRange, token])

  // Handle zip code geocoding
  useEffect(() => {
    const handleZipCodeGeocoding = async () => {
      if (zipCode && zipCode.length === 5 && /^\d{5}$/.test(zipCode)) {
        const coords = await geocodeZipCode(zipCode)
        if (coords) {
          setUserLocation(coords)
        }
      }
    }

    const timeoutId = setTimeout(handleZipCodeGeocoding, 1000) // Debounce
    return () => clearTimeout(timeoutId)
  }, [zipCode])

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

  const renderEventCard = (event: Event) => {
    const CategoryIcon = getCategoryIcon(event.category)
    
    return (
      <Link href={`/event/${event.id}`} key={`event-${event.id}`}>
        <div className="relative aspect-square bg-gray-700 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer group">
          {/* Event Image - fills most of the square, leaving space for title */}
          <OptimizedImage
            src={event.coverImage}
            alt={event.title}
            className="w-full h-4/5 object-cover"
            placeholder="/placeholder-event.jpg"
            sizes="(max-width: 768px) 33vw, 25vw"
          />
          
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Type Badge - Top Left (smaller) */}
          <div className="absolute top-1 left-1">
            <Badge className="bg-purple-600/90 text-white text-[10px] px-1 py-0.5">
              <CategoryIcon className="w-2 h-2 mr-0.5" />
              Event
            </Badge>
          </div>
          
          {/* Price Badge - Under Type Badge */}
          <div className="absolute top-1 left-1 mt-5">
            <Badge className="bg-green-600/90 text-white text-[10px] px-1 py-0.5">
              {formatPrice(event.price)}
            </Badge>
          </div>
          
          {/* Date - Top Right */}
          <div className="absolute top-1 right-1">
            <div className="flex items-center text-white text-[10px] bg-black/50 rounded px-1.5 py-0.5">
              <Calendar className="w-2 h-2 mr-0.5" />
              {formatDate(event.startDate)}
            </div>
          </div>
          
          {/* Distance - Bottom Right (if location is set) */}
          {userLocation && event.latitude && event.longitude && (
            <div className="absolute bottom-1 right-1">
              <div className="flex items-center text-white text-[10px] bg-black/50 rounded px-1.5 py-0.5">
                <MapPin className="w-2 h-2 mr-0.5" />
                {calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude).toFixed(1)}mi
              </div>
            </div>
          )}
          
          {/* Title Area - Bottom reserved space */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <h3 className="font-semibold text-white text-sm line-clamp-2 drop-shadow-lg">
              {event.title}
            </h3>
          </div>
          
          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-3">
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 min-h-[44px] min-w-[44px]">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 min-h-[44px] min-w-[44px]">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const renderHangoutCard = (hangout: Hangout) => {
    return (
      <Link href={`/hangout/${hangout.id}`} key={`hangout-${hangout.id}`}>
        <div className="relative aspect-square bg-gray-700 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer group">
          {/* Hangout Image - fills most of the square, leaving space for title */}
          <OptimizedImage
            src={hangout.image || '/placeholder-hangout.jpg'}
            alt={hangout.title || hangout.activity}
            className="w-full h-4/5 object-cover"
            placeholder="/placeholder-hangout.jpg"
            sizes="(max-width: 768px) 33vw, 25vw"
          />
          
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Type Badge - Top Left (smaller) */}
          <div className="absolute top-1 left-1">
            <Badge className="bg-blue-600/90 text-white text-[10px] px-1 py-0.5">
              <Users className="w-2 h-2 mr-0.5" />
              Hangout
            </Badge>
          </div>
          
          {/* Participants Count - Under Type Badge */}
          <div className="absolute top-1 left-1 mt-5">
            <Badge className="bg-orange-600/90 text-white text-[10px] px-1 py-0.5">
              {hangout.participants?.length || 0}
            </Badge>
          </div>
          
          {/* Date - Top Right */}
          <div className="absolute top-1 right-1">
            <div className="flex items-center text-white text-[10px] bg-black/50 rounded px-1.5 py-0.5">
              <Calendar className="w-2 h-2 mr-0.5" />
              {formatDate(hangout.date)}
            </div>
          </div>
          
          {/* Distance - Bottom Right (if location is set) */}
          {userLocation && hangout.latitude && hangout.longitude && (
            <div className="absolute bottom-1 right-1">
              <div className="flex items-center text-white text-[10px] bg-black/50 rounded px-1.5 py-0.5">
                <MapPin className="w-2 h-2 mr-0.5" />
                {calculateDistance(userLocation.lat, userLocation.lng, hangout.latitude, hangout.longitude).toFixed(1)}mi
              </div>
            </div>
          )}
          
          {/* Title Area - Bottom reserved space */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <h3 className="font-semibold text-white text-sm line-clamp-2 drop-shadow-lg">
              {hangout.title || hangout.activity}
            </h3>
          </div>
          
          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-3">
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 min-h-[44px] min-w-[44px]">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 min-h-[44px] min-w-[44px]">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Discover</h1>
          <CreateEventModal />
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
          <TouchButton
            variant="outline"
            onClick={() => filterBottomSheet.open(2)}
            className="bg-gray-800 border-gray-700 text-white relative min-h-[44px] min-w-[44px] px-4 py-2"
            hapticType="light"
            rippleEffect={true}
          >
            <Filter className="w-5 h-5" />
            {(selectedCategory !== 'all' || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end || zipCode || maxDistance !== 'unlimited') && (
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {[selectedCategory !== 'all' ? 1 : 0, selectedTags.length, priceRange.min ? 1 : 0, priceRange.max ? 1 : 0, dateRange.start ? 1 : 0, dateRange.end ? 1 : 0, zipCode ? 1 : 0, maxDistance !== 'unlimited' ? 1 : 0].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </TouchButton>
        </div>

        {/* Comprehensive Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                Clear All
              </Button>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {commonTags.map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min Price"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  type="number"
                  placeholder="Max Price"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Location Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter zip code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="flex-1 bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    variant="outline"
                    onClick={getCurrentLocation}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={maxDistance} onValueChange={setMaxDistance}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Max distance" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {distanceOptions.map(option => (
                        <SelectItem key={option.id} value={option.id} className="text-white">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {userLocation && (
                  <div className="text-xs text-gray-400">
                    Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                )}
              </div>
            </div>

            {/* Time Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Quick Time Filter</label>
              <Select value={selectedTimeFilter} onValueChange={setSelectedTimeFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {timeFilters.map(filter => (
                    <SelectItem key={filter.id} value={filter.id} className="text-white">
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {sortOptions.map(option => (
                    <SelectItem key={option.id} value={option.id} className="text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Display */}
            {(selectedCategory !== 'all' || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end || zipCode || maxDistance !== 'unlimited') && (
              <div className="pt-4 border-t border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">Active Filters</label>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory !== 'all' && (
                    <Badge className="bg-purple-600 text-white">
                      Category: {categories.find(c => c.id === selectedCategory)?.label}
                    </Badge>
                  )}
                  {selectedTags.map(tag => (
                    <Badge key={tag} className="bg-blue-600 text-white">
                      {tag}
                    </Badge>
                  ))}
                  {priceRange.min && (
                    <Badge className="bg-green-600 text-white">
                      Min: ${priceRange.min}
                    </Badge>
                  )}
                  {priceRange.max && (
                    <Badge className="bg-green-600 text-white">
                      Max: ${priceRange.max}
                    </Badge>
                  )}
                  {dateRange.start && (
                    <Badge className="bg-orange-600 text-white">
                      From: {new Date(dateRange.start).toLocaleDateString()}
                    </Badge>
                  )}
                  {dateRange.end && (
                    <Badge className="bg-orange-600 text-white">
                      To: {new Date(dateRange.end).toLocaleDateString()}
                    </Badge>
                  )}
                  {zipCode && (
                    <Badge className="bg-indigo-600 text-white">
                      Zip: {zipCode}
                    </Badge>
                  )}
                  {maxDistance !== 'unlimited' && (
                    <Badge className="bg-indigo-600 text-white">
                      Within: {distanceOptions.find(d => d.id === maxDistance)?.label}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">All</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-purple-600">Events</TabsTrigger>
            <TabsTrigger value="hangouts" className="data-[state=active]:bg-purple-600">Hangouts</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-purple-600">Saved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-0">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-gray-700 animate-pulse" />
              ))}
            </div>
          ) : mergedContent.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No content found</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create an event or hangout!'}
              </p>
              <CreateEventModal />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0">
              {mergedContent
                .filter(item => {
                  if (activeTab === 'events') return item.type === 'event'
                  if (activeTab === 'hangouts') return item.type === 'hangout'
                  if (activeTab === 'saved') return false // TODO: Implement saved items
                  return true // 'all' tab
                })
                .map(item => 
                  item.type === 'event' 
                    ? renderEventCard(item as Event)
                    : renderHangoutCard(item as Hangout)
                )}
            </div>
          )}
        </div>
      </PullToRefresh>
      
      {/* Bottom Sheet for Filters */}
      <BottomSheet
        isOpen={filterBottomSheet.isOpen}
        onClose={filterBottomSheet.close}
        title="Filters"
        snapPoints={[25, 50, 90]}
        defaultSnapPoint={1}
        hapticEnabled={true}
      >
        <div className="p-4 space-y-6">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {commonTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTag(tag)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min Price"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Input
                type="number"
                placeholder="Max Price"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter zip code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  variant="outline"
                  onClick={getCurrentLocation}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Select value={maxDistance} onValueChange={setMaxDistance}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Max distance" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {distanceOptions.map(option => (
                      <SelectItem key={option.id} value={option.id} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {userLocation && (
                <div className="text-xs text-gray-400">
                  Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>

          {/* Clear All Button */}
          <TouchButton
            variant="outline"
            onClick={clearAllFilters}
            className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            hapticType="medium"
            rippleEffect={true}
          >
            Clear All Filters
          </TouchButton>
        </div>
      </BottomSheet>
    </div>
  )
}


