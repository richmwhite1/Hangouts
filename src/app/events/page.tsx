'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, MapPin, Calendar, DollarSign, Heart, Share2, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { ImprovedCreateEventModal } from '@/components/events/ImprovedCreateEventModal'
import { TileActions } from '@/components/ui/tile-actions'

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
  attendeeCount: number
  isPublic: boolean
  createdBy: string
  createdAt: string
}

export default function EventsPage() {
  const { user, isAuthenticated } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)

  const categories = [
    'Music', 'Sports', 'Food', 'Nightlife', 'Arts', 'Outdoors', 
    'Technology', 'Business', 'Education', 'Health', 'Family'
  ]

  const commonTags = [
    'concert', 'festival', 'workshop', 'networking', 'charity', 'fundraiser',
    'conference', 'seminar', 'exhibition', 'tournament', 'competition', 'show',
    'party', 'gala', 'dinner', 'lunch', 'brunch', 'meetup', 'social',
    'fitness', 'yoga', 'dance', 'art', 'music', 'theater', 'comedy'
  ]

  // Mock data for now - will be replaced with API calls
  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Arctic Monkeys Concert',
      description: 'Experience the legendary Arctic Monkeys live in concert with their latest album tour.',
      category: 'Music',
      venue: 'Madison Square Garden',
      address: '4 Pennsylvania Plaza, New York, NY 10001',
      city: 'New York',
      startDate: '2024-02-15',
      startTime: '20:00',
      price: { min: 75, max: 150, currency: 'USD' },
      coverImage: '/placeholder-event-1.jpg',
      tags: ['rock', 'concert', 'live music'],
      attendeeCount: 15000,
      isPublic: true,
      createdBy: 'user1',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      title: 'Food Truck Festival',
      description: 'Join us for a day of amazing food from local food trucks and live entertainment.',
      category: 'Food',
      venue: 'Central Park',
      address: 'Central Park, New York, NY',
      city: 'New York',
      startDate: '2024-02-20',
      startTime: '12:00',
      price: { min: 0, currency: 'USD' },
      coverImage: '/placeholder-event-2.jpg',
      tags: ['food', 'festival', 'family'],
      attendeeCount: 5000,
      isPublic: true,
      createdBy: 'user2',
      createdAt: '2024-01-10T14:30:00Z'
    }
  ]

  useEffect(() => {
    console.log('EventsPage: useEffect triggered')
    const fetchEvents = async () => {
      try {
        console.log('EventsPage: Starting to fetch events')
        const response = await fetch('/api/events')
        console.log('EventsPage: Response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('EventsPage: Fetched events data:', data)
          setEvents(data.events || data || [])
          console.log('EventsPage: Set events:', data.events || data || [])
        } else {
          console.error('EventsPage: Failed to fetch events, status:', response.status)
          setEvents([])
        }
      } catch (error) {
        console.error('EventsPage: Error fetching events:', error)
        setEvents([])
      } finally {
        console.log('EventsPage: Setting isLoading to false')
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  console.log('EventsPage: Current events state:', events)
  console.log('EventsPage: Current isLoading state:', isLoading)
  
  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Category filter
    const matchesCategory = !selectedCategory || event.category === selectedCategory
    
    // Tags filter
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => event.tags.some(eventTag => 
        eventTag.toLowerCase().includes(tag.toLowerCase())
      ))
    
    // Price filter
    const matchesPrice = (!priceRange.min || event.price.min >= parseInt(priceRange.min)) &&
                        (!priceRange.max || event.price.min <= parseInt(priceRange.max))
    
    // Date filter
    const eventDate = new Date(event.startDate)
    const matchesDate = (!dateRange.start || eventDate >= new Date(dateRange.start)) &&
                       (!dateRange.end || eventDate <= new Date(dateRange.end))
    
    return matchesSearch && matchesCategory && matchesTags && matchesPrice && matchesDate
  })

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

  // Remove authentication requirement for viewing public events
  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-white mb-4">Please sign in to view events</h1>
  //         <p className="text-gray-400">Sign in to discover and create amazing events</p>
  //       </div>
  //     </div>
  //   )
  // }

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
            <Filter className="w-4 h-4" />
            {(selectedCategory || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end) && (
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {[selectedCategory, selectedTags.length, priceRange.min, priceRange.max, dateRange.start, dateRange.end].filter(Boolean).length}
              </span>
            )}
          </Button>
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
            {(selectedCategory || selectedTags.length > 0 || priceRange.min || priceRange.max || dateRange.start || dateRange.end) && (
              <div className="pt-4 border-t border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">Active Filters</label>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory && (
                    <Badge className="bg-purple-600 text-white">
                      Category: {selectedCategory}
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
                      e.currentTarget.nextElementSibling.style.display = 'flex'
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
                      onSave={(id, type) => {
                        // TODO: Implement save functionality
                        console.log('Save event:', id, type)
                      }}
                      onUnsave={(id, type) => {
                        // TODO: Implement unsave functionality
                        console.log('Unsave event:', id, type)
                      }}
                    />
                  </div>
                  
                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-purple-600 text-white">
                      {event.category}
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
                  
                  <div className="mt-4 flex gap-2">
                    <Button 
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // TODO: Navigate to event detail or create hangout
                        console.log('Create hangout for event:', event.id)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Hangout
                    </Button>
                    <Button 
                      variant="outline" 
                      className="bg-gray-700 border-gray-600 text-white"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        window.location.href = `/event/${event.id}`
                      }}
                    >
                      View Details
                    </Button>
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
