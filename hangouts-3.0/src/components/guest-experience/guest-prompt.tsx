'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Calendar, 
  Users, 
  Heart, 
  Star,
  ArrowRight,
  CheckCircle,
  Lock,
  Globe
} from 'lucide-react'

interface GuestPromptProps {
  type: 'hangout' | 'event'
  title: string
  creator?: string
  participants?: number
  attendees?: number
  startTime?: string
  location?: string
  onSignInClick?: () => void
  className?: string
}

export function GuestPrompt({
  type,
  title,
  creator,
  participants,
  attendees,
  startTime,
  location,
  onSignInClick,
  className
}: GuestPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSignInClick = () => {
    if (onSignInClick) {
      onSignInClick()
    } else {
      // Redirect to sign-in with current URL as redirect parameter
      const currentUrl = encodeURIComponent(window.location.href)
      window.location.href = `/signin?redirect_url=${currentUrl}`
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  }

  const displayParticipants = participants || attendees || 0

  return (
    <Card className={`border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/20 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Join {type === 'hangout' ? 'this hangout' : 'this event'}
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            <Globe className="w-3 h-3 mr-1" />
            Public
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Event Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {startTime && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(startTime)}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{location}</span>
              </div>
            )}
            {displayParticipants > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{displayParticipants} {type === 'hangout' ? 'going' : 'attending'}</span>
              </div>
            )}
            {creator && (
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>Created by {creator}</span>
              </div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Sign up to:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>RSVP and join the {type === 'hangout' ? 'hangout' : 'event'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Vote on {type === 'hangout' ? 'hangout' : 'event'} details</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Chat with other participants</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Get updates and notifications</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Create your own {type === 'hangout' ? 'hangouts' : 'events'}</span>
            </div>
          </div>
        </div>

        {/* Expandable Features */}
        {!isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="w-full text-blue-600 hover:text-blue-700"
          >
            See all features <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}

        {isExpanded && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-medium text-sm">More features you'll get:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Heart className="w-3 h-3 text-red-500" />
                <span>Save events</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-500" />
                <span>Rate experiences</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-blue-500" />
                <span>Find friends</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-green-500" />
                <span>Sync calendar</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <Button
            onClick={handleSignInClick}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Sign Up Free
          </Button>
          
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                const currentUrl = encodeURIComponent(window.location.href)
                window.location.href = `/signin?redirect_url=${currentUrl}`
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="text-xs text-gray-500 text-center">
          <Lock className="w-3 h-3 inline mr-1" />
          Your data is secure and private. We never share your personal information.
        </div>
      </CardContent>
    </Card>
  )
}
