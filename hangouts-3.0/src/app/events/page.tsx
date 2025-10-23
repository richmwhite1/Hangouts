'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Filter, MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { ImprovedCreateEventModal } from '@/components/events/ImprovedCreateEventModal'
import { TileActions } from '@/components/ui/tile-actions'
import { useAuth } from '@clerk/nextjs'

interface Event {
  id: string
  title: string
  description: string
  category?: string
  venue: string
  address?: string
  city: string
  startDate?: string
  startTime: string
  price?: { min: number; max?: number; currency: string }
  coverImage?: string
  image?: string
  tags: string[]
  attendeeCount?: number
  isPublic?: boolean
  createdBy?: string
  creator?: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  createdAt: string
  priceMin?: number
  priceMax?: number
  _count?: {
    participants: number
  }
}

export default function EventsPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)

  const categories = [
    'Music', 'Food', 'Sports', 'Art', 'Technology', 'Business', 'Education',
    'Health', 'Fitness', 'Entertainment', 'Travel', 'Fashion', 'Photography',
    'Gaming', 'Books', 'Movies', 'Theater', 'Dance', 'Comedy', 'Networking'
  ]

  const commonTags = [
    'free', 'paid', 'outdoor', 'indoor', 'family', 'adults', 'kids', 'seniors',
    'beginner', 'intermediate', 'advanced', 'professional', 'casual', 'formal',
    'networking', 'educational', 'entertainment', 'social', 'charity', 'volunteer',
    'conference', 'seminar', 'exhibition', 'tournament', 'competition', 'show',
    'party', 'gala', 'dinner', 'lunch', 'brunch', 'meetup', 'social',
    'fitness', 'yoga', 'dance', 'art', 'music', 'theater', 'comedy'
  ]

  useEffect(() => {
    if (!isLoaded) {
      return
    }
    
    const fetchEvents = async () => {
      try {
        // Use public API for non-authenticated users, authenticated API for signed-in users
        const apiEndpoint = isSignedIn ? '/api/events' : '/api/public/content?type=EVENT&privacyLevel=PUBLIC'
        
        const response = await fetch(apiEndpoint)
        
        if (response.ok) {
          const data = await response.json()
          
          if (isSignedIn) {
            // Authenticated API returns { events: [...] }
            setEvents(data.events || [])
          } else {
            // Public API returns { events: [...] } - normalize the data
            const normalizedEvents = (data.events || []).map((event: any) => ({
              ...event,
              startDate: event.startTime ? new Date(event.startTime).toISOString().split('T')[0] : undefined,
              coverImage: event.image,
              price: event.priceMin !== undefined ? {
                min: event.priceMin || 0,
                max: event.priceMax,
                currency: 'USD'
              } : undefined,
              attendeeCount: event._count?.participants || 0,
              isPublic: true,
              createdBy: event.creator?.name || 'Unknown',
              category: event.category || 'General',
              tags: event.tags || []
            }))
            setEvents(normalizedEvents)
          }
        } else {
          console.error('EventsPage: Failed to fetch events:', response.status);
        }
      } catch (error) {
        console.error('EventsPage: Error fetching events:', error);
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [isLoaded, isSignedIn])

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = !selectedCategory || (event.category || 'General') === selectedCategory
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => event.tags.includes(tag))
    
    const eventPrice = event.price || { min: 0, max: 0, currency: 'USD' }
    const matchesPrice = (!priceRange.min || eventPrice.min >= parseFloat(priceRange.min)) &&
                        (!priceRange.max || (eventPrice.max || eventPrice.min) <= parseFloat(priceRange.max))
    
    const eventDate = event.startDate || (event.startTime ? new Date(event.startTime).toISOString().split('T')[0] : '')
    const matchesDate = (!dateRange.start || new Date(eventDate) >= new Date(dateRange.start)) &&
                       (!dateRange.end || new Date(eventDate) <= new Date(dateRange.end))
    
    return matchesSearch && matchesCategory && matchesTags && matchesPrice && matchesDate
  })

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedTags([])
    setPriceRange({ min: '', max: '' })
    setDateRange({ start: '', end: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: { min: number; max?: number; currency: string }) => {
    if (price.min === 0) return 'Free'
    if (price.max && price.max !== price.min) {
      return `$${price.min} - $${price.max}`
    }
    return `$${price.min}`
  }

  // Show public events for non-authenticated users
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header with sign-in prompt */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Public Events</h1>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.href = '/signup'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                Sign Up
              </Button>
              <Button 
                onClick={() => window.location.href = '/signin'}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-700"
                size="sm"
              >
                Sign In
              </Button>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Browse public events. Sign up to create your own events and get personalized recommendations!
          </p>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search events, venues, or tags..."
                className="pl-10 bg-gray-800 border-gray-700 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-800 border-gray-700 text-white relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(selectedCategory || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </div>

          {/* Comprehensive Filters */}
          {showFilters && (
            <div className="mt-4 bg-gray-800 rounded-lg border border-gray-700 max-h-[70vh] overflow-y-auto">
              <div className="p-4">
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
                      variant={selectedCategory === '' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('')}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                    >
                      All
                    </Button>
                    {categories.map(category => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      >
                        {category}
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

                {/* Active Filters Display */}
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory && (
                      <Badge className="bg-blue-600 text-white">
                        Category: {selectedCategory}
                      </Badge>
                    )}
                    {selectedTags.map(tag => (
                      <Badge key={tag} className="bg-green-600 text-white">
                        {tag}
                      </Badge>
                    ))}
                    {priceRange.min && (
                      <Badge className="bg-yellow-600 text-white">
                        Min: ${priceRange.min}
                      </Badge>
                    )}
                    {priceRange.max && (
                      <Badge className="bg-yellow-600 text-white">
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
              </div>
              
              {/* Done Button */}
              <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4">
                <Button
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Events Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="bg-gray-800 border-gray-700">
                  <div className="h-48 bg-gray-700 rounded-t-lg animate-pulse" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'No public events available yet'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = '/signup'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign Up to Create Events
                </Button>
                <Button 
                  onClick={() => window.location.href = '/signin'}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  Sign In
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map(event => (
                <Link key={event.id} href={`/events/public/${event.id}`}>
                  <Card className="bg-gray-800 border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    {/* Event Image */}
                    <div className="relative h-48 bg-gray-700">
                      <img
                        src={event.coverImage || event.image}
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
                      
                      {/* Type Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-black/60 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Event
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-white text-lg line-clamp-2">
                          {event.title}
                        </h3>
                        
                        <div className="flex items-center text-gray-300 text-sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(event.startDate || event.startTime)} at {event.startTime}
                        </div>
                        
                        <div className="flex items-center text-gray-300 text-sm">
                          <MapPin className="w-4 h-4 mr-2" />
                          {event.venue}, {event.city}
                        </div>
                        
                        <div className="flex items-center text-gray-300 text-sm">
                          <DollarSign className="w-4 h-4 mr-2" />
                          {formatPrice(event.price)}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs bg-gray-700 border-gray-600 text-gray-300">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show loading state while Clerk is loading (only for authenticated users)
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <ImprovedCreateEventModal />
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events, venues, or tags..."
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-800 border-gray-700 text-white relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {(selectedCategory || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end) && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Comprehensive Filters */}
        {showFilters && (
          <div className="mt-4 bg-gray-800 rounded-lg border border-gray-700 max-h-[70vh] overflow-y-auto">
            <div className="p-4">
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
                    variant={selectedCategory === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    All
                  </Button>
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                    >
                      {category}
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

              {/* Active Filters Display */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {selectedCategory && (
                    <Badge className="bg-blue-600 text-white">
                      Category: {selectedCategory}
                    </Badge>
                  )}
                  {selectedTags.map(tag => (
                    <Badge key={tag} className="bg-green-600 text-white">
                      {tag}
                    </Badge>
                  ))}
                  {priceRange.min && (
                    <Badge className="bg-yellow-600 text-white">
                      Min: ${priceRange.min}
                    </Badge>
                  )}
                  {priceRange.max && (
                    <Badge className="bg-yellow-600 text-white">
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
            </div>
            
            {/* Done Button */}
            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4">
              <Button
                onClick={() => setShowFilters(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Events Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="bg-gray-800 border-gray-700">
                <div className="h-48 bg-gray-700 rounded-t-lg animate-pulse" />
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create an event!'}
            </p>
            <ImprovedCreateEventModal />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map(event => (
              <Link key={event.id} href={`/event/${event.id}`}>
                <Card className="bg-gray-800 border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  {/* Event Image */}
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
                    
                    {/* Action Buttons - Bottom Right */}
                    <div className="absolute bottom-2 right-2">
                      <TileActions
                        itemId={event.id}
                        itemType="event"
                        itemTitle={event.title}
                        itemDescription={event.description || ''}
                        itemImage={event.coverImage || ''}
                        privacyLevel={event.isPublic ? 'PUBLIC' : 'PRIVATE'}
                        onSave={(_id, _type) => {
                          // console.log('Save event:', id, type); // Removed for production
                        }}
                        onUnsave={(_id, _type) => {
                          // console.log('Unsave event:', id, type); // Removed for production
                        }}
                        className="scale-75"
                      />
                    </div>
                    
                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-black/60 text-white/90 text-xs px-2 py-1 font-normal backdrop-blur-sm border border-white/20">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Event
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-white text-lg line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <div className="flex items-center text-gray-300 text-sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(event.startDate)} at {event.startTime}
                      </div>
                      
                      <div className="flex items-center text-gray-300 text-sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        {event.venue}, {event.city}
                      </div>
                      
                      <div className="flex items-center text-gray-300 text-sm">
                        <DollarSign className="w-4 h-4 mr-2" />
                        {formatPrice(event.price)}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {event.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs bg-gray-700 border-gray-600 text-gray-300">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}