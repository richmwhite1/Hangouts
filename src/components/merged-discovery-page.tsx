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
      
      return matchesSearch && matchesCategory && matchesTags && matchesPrice && matchesDate
    })
  }, [searchQuery, selectedCategory, selectedTags, priceRange, dateRange])

  // Merge and sort content (memoized)
  const mergeAndSortContent = useMemo(() => {
    const allContent = [
      ...events.map(event => ({
        ...event,
        type: 'event',
        sortDate: new Date(event.startDate),
        sortPrice: event.price.min
      })),
      ...hangouts.map(hangout => ({
        ...hangout,
        type: 'hangout',
        sortDate: new Date(hangout.date),
        sortPrice: 0
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
    }

    return sortedContent
  }, [events, hangouts, filterContent, sortBy])

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
          
          {/* Title Area - Bottom reserved space */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <h3 className="font-semibold text-white text-sm line-clamp-2 drop-shadow-lg">
              {event.title}
            </h3>
          </div>
          
          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Heart className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Share2 className="w-4 h-4" />
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
          
          {/* Title Area - Bottom reserved space */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <h3 className="font-semibold text-white text-sm line-clamp-2 drop-shadow-lg">
              {hangout.title || hangout.activity}
            </h3>
          </div>
          
          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Heart className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Share2 className="w-4 h-4" />
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
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <TouchButton
            variant="outline"
            onClick={() => filterBottomSheet.open(2)}
            className="bg-gray-800 border-gray-700 text-white relative"
            hapticType="light"
            rippleEffect={true}
          >
            <Filter className="w-4 h-4" />
            {(selectedCategory !== 'all' || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end) && (
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {[selectedCategory !== 'all' ? 1 : 0, selectedTags.length, priceRange.min ? 1 : 0, priceRange.max ? 1 : 0, dateRange.start ? 1 : 0, dateRange.end ? 1 : 0].reduce((a, b) => a + b, 0)}
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
            {(selectedCategory !== 'all' || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end) && (
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


