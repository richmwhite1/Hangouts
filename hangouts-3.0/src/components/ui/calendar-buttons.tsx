'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Download, ExternalLink, Mail } from 'lucide-react'
import { calendarService, CalendarEvent } from '@/lib/services/calendar-service'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface CalendarButtonsProps {
  event: CalendarEvent
  className?: string
}

export function CalendarButtons({ event, className = '' }: CalendarButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleCalendar = async () => {
    try {
      setIsLoading(true)
      await calendarService.addToGoogleCalendar(event)
      toast.success('Opening Google Calendar...')
    } catch (error) {
      logger.error('Error adding to Google Calendar:', error);
      toast.error('Failed to open Google Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleCalendar = async () => {
    try {
      setIsLoading(true)
      await calendarService.addToAppleCalendar(event)
      toast.success('Calendar event downloaded')
    } catch (error) {
      logger.error('Error adding to Apple Calendar:', error);
      toast.error('Failed to download calendar event')
    } finally {
      setIsLoading(false)
    }
  }

  if (!calendarService.isCalendarSupported()) {
    return null
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={handleGoogleCalendar}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 flex-1"
        title="Add to Google Calendar"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Google
      </Button>
      
      <Button
        onClick={handleAppleCalendar}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 flex-1"
        title="Add to Apple Calendar"
      >
        <Download className="w-4 h-4 mr-2" />
        Apple
      </Button>
    </div>
  )
}
