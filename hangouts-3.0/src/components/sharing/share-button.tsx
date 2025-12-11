'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Share2, 
  CalendarPlus, 
  Copy, 
  Check,
  ExternalLink,
  MessageSquare,
  Mail,
  Twitter,
  Facebook
} from 'lucide-react'
import { logger } from '@/lib/logger'

interface ShareButtonProps {
  url: string
  title: string
  description?: string
  type: 'hangout' | 'event'
  startTime?: string
  endTime?: string
  location?: string
  venue?: string
  city?: string
  price?: number
  hostName?: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}

export function ShareButton({
  url,
  title,
  description,
  type,
  startTime,
  endTime,
  location,
  venue,
  city,
  price,
  hostName,
  className = '',
  size = 'default',
  variant = 'outline'
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'Free'
    return `$${price}`
  }

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink()
      return
    }

    try {
      const shareText = `${hostName || 'Someone'} invited you to ${title}!\n\n${startTime ? `📅 ${formatDate(startTime)}${endTime ? ` at ${formatTime(startTime)}` : ''}` : ''}\n${location ? `📍 ${location}` : venue ? `📍 ${venue}${city ? `, ${city}` : ''}` : ''}\n\nAre you interested?\n👉 ${url}`
      
      await navigator.share({
        title: `Check out this ${type}: ${title}`,
        text: shareText,
        url: url
      })
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Share failed:', error)
        handleCopyLink()
      }
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error)
      // Fallback: show URL in prompt
      prompt('Copy this link to share:', url)
    }
  }

  const handleAddToCalendar = () => {
    if (!startTime) return

    const startDate = new Date(startTime)
    const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours

    const formatDateForCalendar = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const start = formatDateForCalendar(startDate)
    const end = formatDateForCalendar(endDate)

    const calendarTitle = title
    const calendarDescription = description || `Join us for this ${type}!`
    const calendarLocation = location || `${venue || ''}${city ? `, ${city}` : ''}`.trim()

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${start}/${end}&details=${encodeURIComponent(calendarDescription)}&location=${encodeURIComponent(calendarLocation)}`

    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(calendarTitle)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(calendarDescription)}&location=${encodeURIComponent(calendarLocation)}`

    const appleUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${calendarTitle}
DESCRIPTION:${calendarDescription}
LOCATION:${calendarLocation}
END:VEVENT
END:VCALENDAR`

    const calendarOptions = [
      { name: 'Google Calendar', url: googleCalendarUrl, icon: '📅' },
      { name: 'Outlook', url: outlookUrl, icon: '📧' },
      { name: 'Apple Calendar', url: appleUrl, icon: '🍎', isData: true }
    ]

    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add to Calendar</h3>
        <div class="space-y-3">
          ${calendarOptions.map(option => `
            <a href="${option.url}" ${option.isData ? 'download="event.ics"' : 'target="_blank"'}
               class="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span class="text-2xl">${option.icon}</span>
              <span class="text-gray-900 dark:text-white">${option.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link w-4 h-4 text-gray-400 ml-auto"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            </a>
          `).join('')}
        </div>
        <div class="flex justify-end mt-6">
          <button onclick="this.closest('.fixed').remove()"
                  class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Cancel
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'whatsapp' | 'email') => {
    const shareText = `${hostName || 'Someone'} invited you to ${title}!\n\n${startTime ? `📅 ${formatDate(startTime)}${endTime ? ` at ${formatTime(startTime)}` : ''}` : ''}\n${location ? `📍 ${location}` : venue ? `📍 ${venue}${city ? `, ${city}` : ''}` : ''}\n\nAre you interested?\n👉 ${url}`
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(url)

    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}`
        break
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(`Check out this ${type}: ${title}`)}&body=${encodedText}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleNativeShare}
        size={size}
        variant={variant}
        className={className}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      
      {startTime && (
        <Button
          onClick={handleAddToCalendar}
          size={size}
          variant="outline"
          className="border-gray-600 text-white hover:bg-gray-700"
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
      )}

      <Button
        onClick={handleCopyLink}
        size={size}
        variant="ghost"
        className="text-gray-400 hover:text-white"
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  )
}
