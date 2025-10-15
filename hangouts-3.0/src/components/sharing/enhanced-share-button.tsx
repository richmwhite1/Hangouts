'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  ExternalLink,
  Download,
  MessageCircle
} from 'lucide-react'
import { sharingService } from '@/lib/services/sharing-service'
import { CalendarButtons } from '@/components/ui/calendar-buttons'
import { toast } from 'sonner'

interface EnhancedShareButtonProps {
  url: string
  title: string
  description?: string
  image?: string
  type: 'hangout' | 'event'
  startTime?: string
  endTime?: string
  location?: string
  venue?: string
  city?: string
  creator?: string
  participants?: number
  attendees?: number
  price?: string
  category?: string
  privacyLevel?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  className?: string
}

export function EnhancedShareButton({
  url,
  title,
  description,
  image,
  type,
  startTime,
  endTime,
  location,
  venue,
  city,
  creator,
  participants,
  attendees,
  price,
  category,
  privacyLevel = 'PUBLIC',
  className
}: EnhancedShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!sharingService.canSharePublicly(privacyLevel)) {
      toast.error('This content cannot be shared publicly')
      return
    }

    setIsSharing(true)
    try {
      const shareData = {
        title,
        description: description || '',
        image: image || '',
        url,
        type,
        privacyLevel
      }

      const success = await sharingService.shareContent(shareData, {
        includeImage: false,
        includeDescription: true,
        customMessage: `Check out this ${type}: ${title}`
      })

      if (success) {
        toast.success('Shared successfully!')
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Share failed:', error)
      toast.error('Failed to share. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await sharingService.copyLink(url.split('/').pop() || '', type)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Failed to copy link')
    }
  }

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

  const displayLocation = city ? `${venue || location}, ${city}` : (venue || location)
  const displayParticipants = participants || attendees || 0

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={`flex items-center gap-2 ${className}`}
        disabled={!sharingService.canSharePublicly(privacyLevel)}
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Share {type === 'hangout' ? 'Hangout' : 'Event'}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Preview Card */}
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  {image && (
                    <img
                      src={image}
                      alt={title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
                    {description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {type === 'hangout' ? 'Hangout' : 'Event'}
                      </Badge>
                      {privacyLevel === 'PUBLIC' && (
                        <Badge variant="outline" className="text-xs">
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Event Details */}
                <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {startTime && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(startTime)}</span>
                      {endTime && (
                        <span> • {formatTime(startTime)} - {formatTime(endTime)}</span>
                      )}
                    </div>
                  )}
                  {displayLocation && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{displayLocation}</span>
                    </div>
                  )}
                  {displayParticipants > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{displayParticipants} {type === 'hangout' ? 'going' : 'attending'}</span>
                    </div>
                  )}
                  {price && (
                    <div className="flex items-center gap-1">
                      <span>💰</span>
                      <span>{price}</span>
                    </div>
                  )}
                  {creator && (
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>Created by {creator}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar Integration */}
              {startTime && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Add to Calendar</p>
                  <CalendarButtons
                    event={{
                      title,
                      description: description || '',
                      location: displayLocation || '',
                      startTime,
                      endTime: endTime || startTime,
                      url
                    }}
                  />
                </div>
              )}

              {/* Share Actions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Share Options</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full"
                  >
                    {isSharing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Native Share
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Share on Social</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Twitter
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Facebook
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    LinkedIn
                  </Button>
                </div>
              </div>

              {/* Privacy Notice */}
              {privacyLevel !== 'PUBLIC' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    {sharingService.getPrivacyMessage(privacyLevel)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
