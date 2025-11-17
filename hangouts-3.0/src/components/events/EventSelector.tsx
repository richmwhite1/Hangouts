'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Search,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Plus,
  X,
  Check
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
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
}
interface EventSelectorProps {
  onEventSelect: (event: Event) => void
  selectedEvent?: Event | null
  onRemoveEvent: () => void
}
export function EventSelector({ onEventSelect, selectedEvent, onRemoveEvent }: EventSelectorProps) {
  const { getToken } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categories = [
    'MUSIC', 'SPORTS', 'FOOD', 'NIGHTLIFE', 'ARTS', 'OUTDOORS',
    'TECHNOLOGY', 'BUSINESS', 'EDUCATION', 'HEALTH', 'FAMILY', 'OTHER'
  ]
  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory) params.append('category', selectedCategory)
      params.append('limit', '20')
      const response = await fetch(`/api/events?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      logger.error('Error fetching events:', error);
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (isOpen) {
      fetchEvents()
    }
  }, [isOpen, searchQuery, selectedCategory])
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
  const handleEventSelect = (event: Event) => {
    onEventSelect(event)
    setIsOpen(false)
  }
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      MUSIC: 'bg-blue-600',
      SPORTS: 'bg-green-600',
      FOOD: 'bg-orange-600',
      NIGHTLIFE: 'bg-pink-600',
      ARTS: 'bg-blue-600',
      OUTDOORS: 'bg-emerald-600',
      TECHNOLOGY: 'bg-cyan-600',
      BUSINESS: 'bg-gray-600',
      EDUCATION: 'bg-indigo-600',
      HEALTH: 'bg-red-600',
      FAMILY: 'bg-yellow-600',
      OTHER: 'bg-slate-600'
    }
    return colors[category] || 'bg-slate-600'
  }
  return (
    <div className="space-y-4">
      {/* Selected Event Display */}
      {selectedEvent ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${getCategoryColor(selectedEvent.category)} text-white`}>
                    {selectedEvent.category}
                  </Badge>
                  <span className="text-sm text-gray-400">Selected Event</span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">
                  {selectedEvent.title}
                </h3>
                <div className="space-y-1 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedEvent.startDate)} at {selectedEvent.startTime}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.venue}, {selectedEvent.city}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {formatPrice(selectedEvent.price)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemoveEvent}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Event to Hangout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Select an Event</DialogTitle>
              <DialogDescription className="text-gray-400">
                Choose an event to add to your hangout poll options
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search events..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className={selectedCategory === null ? 'bg-blue-600' : 'bg-gray-800 border-gray-700 text-white'}
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    className={selectedCategory === category ? 'bg-blue-600' : 'bg-gray-800 border-gray-700 text-white'}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              {/* Events List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No events found</div>
                ) : (
                  events.map(event => (
                    <Card
                      key={event.id}
                      className="bg-gray-800 border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                      onClick={() => handleEventSelect(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Event Image */}
                          <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                            <img
                              src={event.coverImage?.includes('placeholder.com') ? '/placeholder-event.jpg' : event.coverImage}
                              alt={event.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling.style.display = 'flex'
                              }}
                            />
                            <div className="w-full h-full bg-gray-600 flex items-center justify-center text-gray-400">
                              <Calendar className="w-6 h-6" />
                            </div>
                          </div>
                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${getCategoryColor(event.category)} text-white text-xs`}>
                                {event.category}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-white text-sm line-clamp-1 mb-1">
                              {event.title}
                            </h3>
                            <div className="space-y-1 text-xs text-gray-300">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(event.startDate)} at {event.startTime}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.venue}, {event.city}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatPrice(event.price)}
                              </div>
                            </div>
                          </div>
                          {/* Select Button */}
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}