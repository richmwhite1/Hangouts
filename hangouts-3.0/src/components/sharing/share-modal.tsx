'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Share2, 
  CalendarPlus, 
  Copy, 
  Check,
  X,
  MessageSquare,
  Mail,
  Twitter,
  Facebook,
  ExternalLink,
  QrCode
} from 'lucide-react'
import { logger } from '@/lib/logger'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
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
  image?: string
}

export function ShareModal({
  isOpen,
  onClose,
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
  image
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'share' | 'calendar'>('share')

  if (!isOpen) return null

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error)
      prompt('Copy this link to share:', url)
    }
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

  const handleAddToCalendar = () => {
    if (!startTime) return

    const startDate = new Date(startTime)
    const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

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

    return calendarOptions
  }

  const calendarOptions = handleAddToCalendar()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Share {type === 'hangout' ? 'Hangout' : 'Event'}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Content Preview */}
          <div className="flex gap-4 p-4 bg-gray-700/50 rounded-lg">
            {image && (
              <img
                src={image}
                alt={title}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-300 line-clamp-2">{description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                  {type === 'hangout' ? 'Hangout' : 'Event'}
                </Badge>
                {startTime && (
                  <span className="text-xs text-gray-400">
                    {formatDate(startTime)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('share')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'share'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Share
            </button>
            {startTime && (
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'calendar'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Add to Calendar
              </button>
            )}
          </div>

          {/* Share Tab */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              {/* Native Share */}
              <Button
                onClick={handleNativeShare}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share via Device
              </Button>

              {/* Copy Link */}
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full border-gray-600 text-white hover:bg-gray-700"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>

              {/* Social Media */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleSocialShare('twitter')}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  onClick={() => handleSocialShare('facebook')}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={() => handleSocialShare('whatsapp')}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  onClick={() => handleSocialShare('email')}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>

              {/* URL Display */}
              <div className="p-3 bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Share URL:</p>
                <p className="text-sm text-white break-all">{url}</p>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && calendarOptions && (
            <div className="space-y-3">
              {calendarOptions.map((option) => (
                <a
                  key={option.name}
                  href={option.url}
                  target={option.isData ? undefined : '_blank'}
                  download={option.isData ? 'event.ics' : undefined}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-white flex-1">{option.name}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
