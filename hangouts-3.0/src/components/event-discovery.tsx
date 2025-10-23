'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Calendar, MapPin, DollarSign, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { EventCardWithActions } from '@/components/event-action-modal'

interface EventResult {
  title: string
  venue: string
  date: string
  time: string
  price: string
  url: string
  description?: string
  imageUrl?: string
}

interface EventDiscoveryProps {
  onEventInterest?: (event: EventResult) => void
  userLocation?: string
}

export function EventDiscovery({ onEventInterest, userLocation }: EventDiscoveryProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<EventResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch('/api/events/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          location: userLocation
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for events')
      }

      setEvents(data.data || [])
      
      if (data.data && data.data.length > 0) {
        toast.success(`Found ${data.data.length} events!`)
      } else {
        toast.info('No events found. Try a different search.')
      }

    } catch (error) {
      console.error('Event discovery error:', error)
      toast.error('Failed to search for events. Please try again.')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleEventInterest = async (event: EventResult) => {
    if (onEventInterest) {
      onEventInterest(event)
    } else {
      // Default behavior: scrape event details and save
      await scrapeAndSaveEvent(event)
    }
  }

  const scrapeAndSaveEvent = async (event: EventResult) => {
    try {
      toast.loading('Getting event details...', { id: 'scraping' })

      // Step 1: Scrape the event
      const scrapeResponse = await fetch('/api/events/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventUrl: event.url,
          basicEventData: {
            title: event.title,
            venue: event.venue,
            date: event.date,
            time: event.time,
            price: event.price
          }
        }),
      })

      const scrapeData = await scrapeResponse.json()

      if (!scrapeResponse.ok) {
        throw new Error(scrapeData.error || 'Failed to scrape event details')
      }

      toast.loading('Saving event...', { id: 'scraping' })

      // Step 2: Save the scraped event
      const saveResponse = await fetch('/api/events/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scrapedEventData: scrapeData.data,
          originalUrl: event.url
        }),
      })

      const saveData = await saveResponse.json()

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Failed to save event')
      }

      toast.success('Event saved to your interests!', { id: 'scraping' })

    } catch (error) {
      console.error('Error scraping/saving event:', error)
      toast.error('Failed to save event. Please try again.', { id: 'scraping' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Discover Events</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Find concerts, shows, and activities happening near you
          </p>
        </div>
        
        <div className="flex gap-2 max-w-md mx-auto">
          <Input
            placeholder="What are you looking for? (e.g., concerts this weekend)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !query.trim()}
            className="px-6"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Searching for events...</p>
        </div>
      )}

      {/* No Results */}
      {hasSearched && !isLoading && events.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto mb-2" />
            <p>No events found for "{query}"</p>
            <p className="text-sm">Try a different search term or location</p>
          </div>
        </div>
      )}

      {/* Event Results */}
      {events.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              Found {events.length} event{events.length !== 1 ? 's' : ''}
            </h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <EventCardWithActions 
                key={index} 
                event={event} 
                onEventInterest={onEventInterest}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

