'use client'
import React, { useState, useEffect } from 'react'
import { X, Search, Calendar, MapPin, DollarSign, Plus, TrendingUp, Sparkles, Loader2 } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { MobileModal } from './mobile-modal'
import { Tabs, TabsList, TabsTrigger } from './tabs'
import { logger } from '@/lib/logger'
interface Event {
  id: string
  title: string
  description?: string
  venue?: string
  address?: string
  city?: string
  startDate?: string
  startTime?: string
  price?: {
    min: number
    max?: number
    currency: string
  }
  coverImage?: string
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  tags?: string[]
}
interface EventSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectEvent: (event: Event) => void
  currentOptions: any[]
}
export function EventSelectionModal({ isOpen, onClose, onSelectEvent, currentOptions }: EventSelectionModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'my-events' | 'browse' | 'trending'>('my-events')
  
  // Events state
  const [events, setEvents] = useState<Event[]>([])
  const [browseEvents, setBrowseEvents] = useState<Event[]>([])
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [browseSearchQuery, setBrowseSearchQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('Salt Lake City, UT') // Default location
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isBrowseLoading, setIsBrowseLoading] = useState(false)
  const [isTrendingLoading, setIsTrendingLoading] = useState(false)
  // Fetch events when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'my-events') {
        fetchMyEvents()
      } else if (activeTab === 'trending') {
        fetchTrendingEvents()
      }
    }
  }, [isOpen, activeTab])
  
  // Get user's location on mount
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Reverse geocode would go here - for now use default
          // Could use Google Geocoding API
        },
        (error) => {
          logger.warn('Could not get user location:', error)
        }
      )
    }
  }, [isOpen])
  // Filter events based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(events)
    } else {
      const filtered = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredEvents(filtered)
    }
  }, [searchQuery, events])
  const fetchMyEvents = async () => {
    try {
      setIsLoading(true)
      // Fetch user's saved/interested events from the API
      const response = await fetch('/api/events/saved')
      if (response.ok) {
        const data = await response.json()
        const savedEvents = data.data || data.events || []
        setEvents(savedEvents)
        setFilteredEvents(savedEvents)
      } else {
        // Fallback to all public events if saved events endpoint fails
        const fallbackResponse = await fetch('/api/events')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setEvents(fallbackData.events || [])
          setFilteredEvents(fallbackData.events || [])
        }
      }
    } catch (error) {
      logger.error('Error fetching events:', error);
    } finally {
      setIsLoading(false)
    }
  }
  
  const searchBrowseEvents = async () => {
    if (!browseSearchQuery.trim()) return
    
    try {
      setIsBrowseLoading(true)
      const params = new URLSearchParams({
        q: browseSearchQuery,
        location: locationQuery,
        limit: '10'
      })
      
      const response = await fetch(`/api/events/search?${params}`)
      if (response.ok) {
        const data = await response.json()
        setBrowseEvents(data.events || [])
      } else {
        logger.error('Failed to search events')
        setBrowseEvents([])
      }
    } catch (error) {
      logger.error('Error searching events:', error)
      setBrowseEvents([])
    } finally {
      setIsBrowseLoading(false)
    }
  }
  
  const fetchTrendingEvents = async () => {
    try {
      setIsTrendingLoading(true)
      const params = new URLSearchParams({
        location: locationQuery
      })
      
      const response = await fetch(`/api/events/trending?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTrendingEvents(data.events || [])
      } else {
        logger.error('Failed to fetch trending events')
        setTrendingEvents([])
      }
    } catch (error) {
      logger.error('Error fetching trending events:', error)
      setTrendingEvents([])
    } finally {
      setIsTrendingLoading(false)
    }
  }
  const handleSelectEvent = (event: Event) => {
    // Add a brief visual feedback
    const eventElement = document.querySelector(`[data-event-id="${event.id}"]`)
    if (eventElement) {
      eventElement.classList.add('bg-blue-600/20', 'border-blue-500')
      setTimeout(() => {
        eventElement.classList.remove('bg-blue-600/20', 'border-blue-500')
      }, 200)
    }
    // Small delay to show the feedback before closing
    setTimeout(() => {
      onSelectEvent(event)
      onClose()
    }, 150)
  }
  const formatDateTime = (startDate: string, startTime?: string) => {
    if (!startDate) return 'No date set'
    const date = new Date(startDate)
    if (startTime) {
      const [hours, minutes] = startTime.split(':')
      date.setHours(parseInt(hours), parseInt(minutes))
    }
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  const getLocation = (event: Event) => {
    const parts = [event.venue, event.address, event.city].filter(Boolean)
    return parts.join(', ') || 'Location TBD'
  }
  const getPrice = (event: Event) => {
    if (!event.price) return null
    const { min, max, currency } = event.price
    if (min === 0 && (!max || max === 0)) return 'Free'
    if (max && max !== min) return `$${min}-${max} ${currency}`
    return `$${min} ${currency}`
  }
  // Get current events based on active tab
  const getCurrentEvents = () => {
    switch (activeTab) {
      case 'my-events':
        return filteredEvents
      case 'browse':
        return browseEvents
      case 'trending':
        return trendingEvents
      default:
        return []
    }
  }
  
  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'my-events':
        return isLoading
      case 'browse':
        return isBrowseLoading
      case 'trending':
        return isTrendingLoading
      default:
        return false
    }
  }

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select an Event"
      className="bg-black border-gray-600"
      closeOnBackdropClick={true}
      closeOnEscape={true}
      preventBodyScroll={true}
    >
        {/* Tabs */}
        <div className="p-4 border-b border-gray-600">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="my-events" className="data-[state=active]:bg-purple-600">
                My Events
              </TabsTrigger>
              <TabsTrigger value="browse" className="data-[state=active]:bg-blue-600">
                <Sparkles className="w-4 h-4 mr-1" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="trending" className="data-[state=active]:bg-orange-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                Trending
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-600">
          {activeTab === 'my-events' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search your events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black border-gray-600 text-white"
              />
            </div>
          )}
          
          {activeTab === 'browse' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events (e.g., concerts, food festival)..."
                  value={browseSearchQuery}
                  onChange={(e) => setBrowseSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchBrowseEvents()}
                  className="pl-10 bg-black border-gray-600 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Location"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="flex-1 bg-black border-gray-600 text-white text-sm"
                />
                <Button
                  onClick={searchBrowseEvents}
                  disabled={!browseSearchQuery.trim() || isBrowseLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isBrowseLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {activeTab === 'trending' && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Popular events in {locationQuery}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTrendingEvents}
                disabled={isTrendingLoading}
                className="text-orange-400 hover:text-orange-300"
              >
                Refresh
              </Button>
            </div>
          )}
        </div>
        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4">
          {getCurrentLoading() ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading events...</p>
            </div>
          ) : getCurrentEvents().length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {activeTab === 'browse' 
                  ? 'Enter a search query to find events'
                  : 'No events found'
                }
              </p>
              <p className="text-gray-500 text-sm">
                {activeTab === 'my-events' 
                  ? 'Try the Browse or Trending tabs to discover events'
                  : activeTab === 'browse'
                  ? 'Try searching for "concerts", "festivals", "sports", etc.'
                  : 'Check back later for trending events'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {getCurrentEvents().map((event) => (
                <Card
                  key={event.id}
                  data-event-id={event.id}
                  className="cursor-pointer transition-all border-gray-600 hover:border-blue-500 hover:bg-blue-900/10"
                  onClick={() => handleSelectEvent(event)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {/* Event Image */}
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        {event.coverImage ? (
                          <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Calendar className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold mb-1 truncate">{event.title}</h3>
                        {event.description && (
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-32">{getLocation(event)}</span>
                          </div>
                          {event.startDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDateTime(event.startDate, event.startTime)}</span>
                            </div>
                          )}
                          {getPrice(event) && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{getPrice(event)}</span>
                            </div>
                          )}
                        </div>
                        {/* Creator and Tags */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={event.creator.avatar || '/placeholder-avatar.png'}
                              alt={event.creator.name}
                              className="w-4 h-4 rounded-full"
                            />
                            <span className="text-xs text-gray-400">{event.creator.name}</span>
                          </div>
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex gap-1">
                              {event.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </MobileModal>
  )
}