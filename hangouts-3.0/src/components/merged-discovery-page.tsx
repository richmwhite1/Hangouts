'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TouchButton } from '@/components/ui/touch-button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MobileFullScreenModal } from '@/components/ui/mobile-modal'
import { useVisualFeedback } from '@/hooks/use-visual-feedback'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { isPastDate } from '@/lib/date-utils'
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Users,
  Music,
  Coffee,
  Utensils,
  Mountain,
  Dumbbell,
  Palette,
  Building2,
  GraduationCap,
  Heart as HealthIcon,
  Home,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { CreateEventModal } from '@/components/events/CreateEventModal'
import { TileActions } from '@/components/ui/tile-actions'
import Link from 'next/link'
import { logger } from '@/lib/logger'
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
  { id: 'closest', label: 'Closest to me' },
  { id: 'coming-up', label: 'Coming up next' },
  { id: 'newest', label: 'Newest First' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'distance', label: 'Distance: Closest First' },
  { id: 'date-asc', label: 'Date: Soonest First' },
  { id: 'date-desc', label: 'Date: Latest First' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
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
  const { isSignedIn, isLoaded } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('closest')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [mergedContent, setMergedContent] = useState<any[]>([])
  const [showPastContent, setShowPastContent] = useState(false)
  // Comprehensive filtering state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  // Location filtering state
  const [zipCode, setZipCode] = useState('')
  const [maxDistance, setMaxDistance] = useState('50')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  // Filter modal state
  // Visual feedback
  const { showSuccess, showError, showLoading } = useVisualFeedback()
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
      logger.error('Geocoding error:', error);
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
  // Convert coordinates to city name
  const getCityName = (lat: number, lng: number): string => {
    // Simple approximation based on coordinates
    // San Francisco area
    if (lat >= 37.7 && lat <= 37.8 && lng >= -122.5 && lng <= -122.3) {
      return 'San Francisco, CA'
    }
    // New York area
    if (lat >= 40.6 && lat <= 40.8 && lng >= -74.1 && lng <= -73.9) {
      return 'New York, NY'
    }
    // Los Angeles area
    if (lat >= 34.0 && lat <= 34.1 && lng >= -118.3 && lng <= -118.2) {
      return 'Los Angeles, CA'
    }
    // Chicago area
    if (lat >= 41.8 && lat <= 41.9 && lng >= -87.7 && lng <= -87.6) {
      return 'Chicago, IL'
    }
    // Boston area
    if (lat >= 42.3 && lat <= 42.4 && lng >= -71.1 && lng <= -71.0) {
      return 'Boston, MA'
    }
    // Seattle area
    if (lat >= 47.6 && lat <= 47.7 && lng >= -122.4 && lng <= -122.2) {
      return 'Seattle, WA'
    }
    // Miami area
    if (lat >= 25.7 && lat <= 25.8 && lng >= -80.3 && lng <= -80.1) {
      return 'Miami, FL'
    }
    // Denver area
    if (lat >= 39.7 && lat <= 39.8 && lng >= -105.1 && lng <= -104.9) {
      return 'Denver, CO'
    }
    // Austin area
    if (lat >= 30.2 && lat <= 30.3 && lng >= -97.8 && lng <= -97.7) {
      return 'Austin, TX'
    }
    // Portland area
    if (lat >= 45.5 && lat <= 45.6 && lng >= -122.7 && lng <= -122.6) {
      return 'Portland, OR'
    }
    // Default fallback
    return `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`
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
          logger.error('Geolocation error:', error);
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
      params.append('includePast', showPastContent ? 'true' : 'false')
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
      
      // Use public API for non-authenticated users
      const apiEndpoint = isSignedIn ? '/api/events' : '/api/public/content'
      params.append('includePast', showPastContent ? 'true' : 'false')

      if (!isSignedIn) {
        params.append('type', 'EVENT')
        params.append('privacyLevel', 'PUBLIC')
      }
      
      const response = await fetch(`${apiEndpoint}?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (isSignedIn) {
          setEvents(data.events || [])
        } else {
          // Map public events to event format
          const publicEvents = (data.events || []).map((item: any) => ({
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
          setEvents(publicEvents)
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
      await Promise.all([fetchHangouts(), fetchEvents()])
      showSuccess('Content refreshed!')
    } catch (error) {
      showError('Failed to refresh content')
    }
  }
  // Handle ZIP code submission
  const handleZipCodeSubmit = async () => {
    if (zipCode && zipCode.length === 5 && /^\d{5}$/.test(zipCode)) {
      const coords = await geocodeZipCode(zipCode)
      if (coords) {
        setUserLocation(coords)
        showSuccess(`Location updated to ${getCityName(coords.lat, coords.lng)}`)
      } else {
        showError('Invalid ZIP code')
      }
    } else {
      showError('Please enter a valid 5-digit ZIP code')
    }
  }
  // Fetch hangouts
  const fetchHangouts = async () => {
    try {
      // Use public API for non-authenticated users
      const apiEndpoint = isSignedIn ? '/api/discover' : '/api/public/content'
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
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
          createdAt: hangout.createdAt
        }))
        setHangouts(mappedHangouts)
      }
    } catch (error) {
      logger.error('Error fetching hangouts:', error);
    }
  }
  // Filter content based on all filter criteria
  const filterContent = useCallback((content: any[]) => {
    return content.filter(item => {
      // Search filter
      const matchesSearch = !searchQuery ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.venue && item.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.tags && item.tags.some((tag: string) => tag && tag.toLowerCase().includes(searchQuery.toLowerCase())))
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
    const now = Date.now()
    const allContent = [
      ...events.map(event => ({
        ...event,
        type: 'event',
        sortDate: new Date(event.startDate),
        isPast: isPastDate(event.startDate),
        sortPrice: event.price.min,
        sortDistance: userLocation && event.latitude && event.longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
          : Infinity
      })),
      ...hangouts.map(hangout => ({
        ...hangout,
        type: 'hangout',
        sortDate: new Date(hangout.date),
        isPast: isPastDate(hangout.date),
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
    Promise.all([
      fetchEvents(), 
      fetchHangouts()
    ]).finally(() => {
      setIsLoading(false)
    })
  }, [isSignedIn, isLoaded, showPastContent])
  useEffect(() => {
    // Wait for authentication to load before refetching data
    if (!isLoaded) return
    
    // Refetch both events and hangouts when filters change
    Promise.all([fetchEvents(), fetchHangouts()])
  }, [searchQuery, selectedCategory, selectedTimeFilter, dateRange, showPastContent, isLoaded])
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
  const renderEventCard = (event: Event & { isPast?: boolean }) => {
    const CategoryIcon = getCategoryIcon(event.category)
    const distance = userLocation && event.latitude && event.longitude
      ? calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
      : null
    return (
      <Link href={`/event/${event.id}`} key={`event-${event.id}`}>
        <div className="relative w-full h-80 bg-gray-700 overflow-hidden hover:opacity-95 transition-opacity cursor-pointer group rounded-xl">
          {/* Event Image - full width */}
          <OptimizedImage
            src={event.coverImage}
            alt={event.title}
            className="w-full h-full object-cover"
            placeholder="/placeholder-event.jpg"
            sizes="100vw"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
        <div className="relative w-full h-80 bg-gray-700 overflow-hidden hover:opacity-95 transition-opacity cursor-pointer group rounded-xl">
          {/* Hangout Image - full width */}
          <OptimizedImage
            src={hangout.image || '/placeholder-hangout.jpg'}
            alt={hangout.title || hangout.activity}
            className="w-full h-full object-cover"
            placeholder="/placeholder-hangout.jpg"
            sizes="100vw"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
          <TouchButton
            onClick={() => setIsFilterModalOpen(true)}
            className="bg-gray-800 border-gray-700 text-white relative min-h-[44px] min-w-[44px] px-4 py-2"
            hapticType="light"
            rippleEffect={true}
          >
            <Filter className="w-5 h-5" />
          </TouchButton>
        </div>
        {/* Comprehensive Filters */}
        {isFilterModalOpen && (
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
                    <Badge className="bg-blue-600 text-white">
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
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">All</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-blue-600">Events</TabsTrigger>
            <TabsTrigger value="hangouts" className="data-[state=active]:bg-blue-600">Hangouts</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-blue-600">Saved</TabsTrigger>
          </TabsList>
          {/* Discreet Sort and Filter Controls - Single Line */}
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-6 w-auto min-w-[80px] bg-gray-800 border-gray-700 text-gray-300 text-xs focus:ring-0 px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="closest" className="text-white hover:bg-gray-700 text-xs">Distance</SelectItem>
                    <SelectItem value="coming-up" className="text-white hover:bg-gray-700 text-xs">Date</SelectItem>
                    <SelectItem value="newest" className="text-white hover:bg-gray-700 text-xs">Newest</SelectItem>
                    <SelectItem value="popular" className="text-white hover:bg-gray-700 text-xs">Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Within:</span>
                <Select value={maxDistance} onValueChange={setMaxDistance}>
                  <SelectTrigger className="h-6 w-auto min-w-[60px] bg-gray-800 border-gray-700 text-gray-300 text-xs focus:ring-0 px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="10" className="text-white hover:bg-gray-700 text-xs">10mi</SelectItem>
                    <SelectItem value="25" className="text-white hover:bg-gray-700 text-xs">25mi</SelectItem>
                    <SelectItem value="50" className="text-white hover:bg-gray-700 text-xs">50mi</SelectItem>
                    <SelectItem value="100" className="text-white hover:bg-gray-700 text-xs">100mi</SelectItem>
                    <SelectItem value="unlimited" className="text-white hover:bg-gray-700 text-xs">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPastContent(prev => !prev)}
                  className="h-6 bg-gray-800 border-gray-700 text-gray-300 text-xs hover:bg-gray-700 px-2"
                >
                  {showPastContent ? 'Hide past' : 'Show past'}
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-300 text-xs">
                  {userLocation ? getCityName(userLocation.lat, userLocation.lng) : 'Detecting...'}
                </span>
                <Input
                  placeholder="ZIP"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-12 h-5 bg-gray-800 border-gray-700 text-white text-xs px-1"
                />
                <TouchButton
                  onClick={handleZipCodeSubmit}
                  className="h-5 w-5 bg-gray-700 text-white text-xs p-0"
                  hapticType="light"
                >
                  ✓
                </TouchButton>
              </div>
            </div>
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
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No content found</h3>
                <p className="text-gray-400 mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create an event or hangout!'}
                </p>
                <CreateEventModal />
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
            )
          })()}
        </div>
      </PullToRefresh>
      {/* Full Screen Filter Modal */}
      <MobileFullScreenModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filters"
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
            onClick={clearAllFilters}
            className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            hapticType="medium"
            rippleEffect={true}
          >
            Clear All Filters
          </TouchButton>
        </div>
      </MobileFullScreenModal>
    </div>
  )
}