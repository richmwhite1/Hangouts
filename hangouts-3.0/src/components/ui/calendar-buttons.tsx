'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, Mail, Check } from 'lucide-react'
import { CalendarService, CalendarEvent } from '@/lib/services/calendar-service'

import { logger } from '@/lib/logger'
interface CalendarButtonsProps {
  event: CalendarEvent
  className?: string
  showReminders?: boolean
  defaultReminders?: number[] // Minutes before event
}

export function CalendarButtons({ 
  event, 
  className = '', 
  showReminders = true,
  defaultReminders = [1440, 60] // 1 day and 1 hour before
}: CalendarButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [addedTo, setAddedTo] = useState<string | null>(null)
  const [reminders, setReminders] = useState<number[]>(defaultReminders)

  // Auto-detect timezone if not provided
  useEffect(() => {
    if (!event.timezone) {
      event.timezone = CalendarService.getUserTimezone()
    }
  }, [event])

  // Set default reminders if not provided
  useEffect(() => {
    if (!event.reminders) {
      event.reminders = reminders
    }
  }, [event, reminders])

  const handleGoogleCalendar = async () => {
    try {
      setIsLoading(true)
      const enhancedEvent = { ...event, reminders, timezone: event.timezone || CalendarService.getUserTimezone() }
      await CalendarService.addToGoogleCalendar(enhancedEvent)
      setAddedTo('google')
      CalendarService.showSuccessMessage('Added to Google Calendar!')
      
      // Reset "added" state after 3 seconds
      setTimeout(() => setAddedTo(null), 3000)
    } catch (error) {
      logger.error('Error adding to Google Calendar:', error);
      CalendarService.showSuccessMessage('Failed to add to Google Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleCalendar = async () => {
    try {
      setIsLoading(true)
      const enhancedEvent = { ...event, reminders, timezone: event.timezone || CalendarService.getUserTimezone() }
      await CalendarService.addToAppleCalendar(enhancedEvent)
      setAddedTo('apple')
      CalendarService.showSuccessMessage('Added to Apple Calendar!')
      
      setTimeout(() => setAddedTo(null), 3000)
    } catch (error) {
      logger.error('Error adding to Apple Calendar:', error);
      CalendarService.showSuccessMessage('Failed to add to Apple Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOutlookCalendar = async () => {
    try {
      setIsLoading(true)
      const enhancedEvent = { ...event, reminders, timezone: event.timezone || CalendarService.getUserTimezone() }
      await CalendarService.addToOutlookCalendar(enhancedEvent)
      setAddedTo('outlook')
      CalendarService.showSuccessMessage('Added to Outlook Calendar!')
      
      setTimeout(() => setAddedTo(null), 3000)
    } catch (error) {
      logger.error('Error adding to Outlook Calendar:', error);
      CalendarService.showSuccessMessage('Failed to add to Outlook Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const getReminderLabel = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m before`
    if (minutes < 1440) return `${minutes / 60}h before`
    return `${minutes / 1440}d before`
  }

  if (!CalendarService.isCalendarSupported()) {
    return null
  }

  const isIOS = CalendarService.isIOSDevice()
  const isAndroid = CalendarService.isAndroidDevice()

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Reminder options */}
      {showReminders && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Reminders</label>
          <div className="flex flex-wrap gap-2">
            {[60, 1440, 10080].map((minutes) => (
              <button
                key={minutes}
                onClick={() => {
                  if (reminders.includes(minutes)) {
                    setReminders(reminders.filter(r => r !== minutes))
                  } else {
                    setReminders([...reminders, minutes])
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  reminders.includes(minutes)
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-muted/30 border-muted text-muted-foreground hover:border-muted-foreground/50'
                }`}
              >
                {reminders.includes(minutes) && <Check className="w-3 h-3 inline mr-1" />}
                {getReminderLabel(minutes)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleGoogleCalendar}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className={`flex-1 transition-all ${
            addedTo === 'google'
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
          }`}
          title="Add to Google Calendar with reminders"
        >
          {addedTo === 'google' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Added!
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              Google
            </>
          )}
        </Button>
        
        <Button
          onClick={handleAppleCalendar}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className={`flex-1 transition-all ${
            addedTo === 'apple'
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
          } ${isIOS ? 'ring-2 ring-blue-500/30' : ''}`}
          title={`Add to Apple Calendar with reminders${isIOS ? ' (Recommended for your device)' : ''}`}
        >
          {addedTo === 'apple' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Added!
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Apple
              {isIOS && ' ✨'}
            </>
          )}
        </Button>
        
        <Button
          onClick={handleOutlookCalendar}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className={`flex-1 transition-all ${
            addedTo === 'outlook'
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
          }`}
          title="Add to Outlook Calendar with reminders"
        >
          {addedTo === 'outlook' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Added!
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Outlook
            </>
          )}
        </Button>
      </div>

      {/* Timezone indicator */}
      <p className="text-xs text-muted-foreground text-center">
        Times in {event.timezone || CalendarService.getUserTimezone()}
      </p>
    </div>
  )
}
