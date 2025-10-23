'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, MapPin, DollarSign, Users, Plus, ExternalLink, Save } from 'lucide-react'
import { toast } from 'sonner'

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

interface ScrapedEventData {
  title: string
  artist?: string
  venue: {
    name: string
    address: string
  }
  datetime: string
  price: {
    min?: number
    max?: number
    currency: string
    description: string
  }
  description: string
  imageUrl?: string
  ticketUrl: string
  ageRestriction?: string
  category?: string
  tags?: string[]
}

interface EventActionModalProps {
  event: EventResult
  scrapedData?: ScrapedEventData
  onClose: () => void
}

export function EventActionModal({ event, scrapedData, onClose }: EventActionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<'save' | 'create-hangout' | null>(null)

  const handleSaveEvent = async () => {
    if (!scrapedData) {
      toast.error('Event details not available')
      return
    }

    setIsLoading(true)
    setAction('save')

    try {
      const response = await fetch('/api/events/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scrapedEventData: scrapedData,
          originalUrl: event.url
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save event')
      }

      toast.success('Event saved to your interests!')
      onClose()

    } catch (error) {
      console.error('Error saving event:', error)
      toast.error('Failed to save event. Please try again.')
    } finally {
      setIsLoading(false)
      setAction(null)
    }
  }

  const handleCreateHangout = () => {
    // Navigate to hangout creation with pre-filled data
    const hangoutData = {
      title: scrapedData?.title || event.title,
      description: scrapedData?.description || event.description || '',
      venue: scrapedData?.venue?.name || event.venue,
      address: scrapedData?.venue?.address || '',
      startTime: scrapedData?.datetime || `${event.date}T${event.time}`,
      image: scrapedData?.imageUrl || event.imageUrl,
      ticketUrl: scrapedData?.ticketUrl || event.url,
      eventCategory: scrapedData?.category || 'OTHER',
      tags: scrapedData?.tags || []
    }

    // Store the data in sessionStorage for the hangout creation page
    sessionStorage.setItem('prefilledHangoutData', JSON.stringify(hangoutData))
    
    // Navigate to hangout creation
    window.location.href = '/create?fromEvent=true'
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event.title}
          </DialogTitle>
          <DialogDescription>
            What would you like to do with this event?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Details */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{event.date} at {event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>{event.price}</span>
                </div>
                {scrapedData?.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {scrapedData.description.substring(0, 100)}...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSaveEvent}
              disabled={isLoading || !scrapedData}
              variant="outline"
              className="flex-1"
            >
              {action === 'save' && isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Event
            </Button>

            <Button
              onClick={handleCreateHangout}
              disabled={isLoading}
              className="flex-1"
            >
              {action === 'create-hangout' && isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Hangout
            </Button>
          </div>

          {/* Additional Options */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(event.url, '_blank')}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Tickets
            </Button>
          </div>

          {/* Event Tags */}
          {scrapedData?.tags && scrapedData.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {scrapedData.tags.slice(0, 5).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface EventCardWithActionsProps {
  event: EventResult
  onEventInterest?: (event: EventResult) => void
}

export function EventCardWithActions({ event, onEventInterest }: EventCardWithActionsProps) {
  const [showActionModal, setShowActionModal] = useState(false)
  const [scrapedData, setScrapedData] = useState<ScrapedEventData | null>(null)
  const [isScraping, setIsScraping] = useState(false)

  const handleEventInterest = async () => {
    if (onEventInterest) {
      onEventInterest(event)
      return
    }

    // Scrape event details first
    setIsScraping(true)
    
    try {
      const response = await fetch('/api/events/scrape', {
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get event details')
      }

      setScrapedData(data.data)
      setShowActionModal(true)

    } catch (error) {
      console.error('Error scraping event:', error)
      toast.error('Failed to get event details. Please try again.')
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.venue}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Date and Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{event.date}</span>
            {event.time && event.time !== 'TBD' && (
              <>
                <span>•</span>
                <span>{event.time}</span>
              </>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-600" />
            <Badge variant="secondary" className="text-xs">
              {event.price}
            </Badge>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleEventInterest}
              size="sm" 
              className="flex-1"
              disabled={isScraping}
            >
              {isScraping ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
              ) : (
                <Users className="h-3 w-3 mr-2" />
              )}
              I'm Interested
            </Button>
            
            {event.url && event.url !== '#' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(event.url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Modal */}
      {showActionModal && (
        <EventActionModal
          event={event}
          scrapedData={scrapedData || undefined}
          onClose={() => {
            setShowActionModal(false)
            setScrapedData(null)
          }}
        />
      )}
    </>
  )
}
