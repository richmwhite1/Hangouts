'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock,
  ExternalLink,
  Users
} from 'lucide-react'

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

interface EventPollOptionProps {
  event: Event
  isSelected?: boolean
  onSelect?: () => void
  showVoteCount?: boolean
  voteCount?: number
  userVote?: boolean
}

export function EventPollOption({ 
  event, 
  isSelected = false, 
  onSelect, 
  showVoteCount = false,
  voteCount = 0,
  userVote = false
}: EventPollOptionProps) {
  const formatPrice = (price: Event['price']) => {
    if (!price) return 'Price TBD'
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
    <Card 
      className={`bg-gray-800 border-gray-700 overflow-hidden transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-blue-500 border-blue-500' 
          : 'hover:border-gray-600'
      } ${userVote ? 'ring-2 ring-green-500 border-green-500' : ''}`}
    >
      {/* Event Image */}
      <div className="relative h-32 bg-gray-700">
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling.style.display = 'flex'
          }}
        />
        <div className="absolute inset-0 bg-gray-600 flex items-center justify-center text-gray-400">
          <Calendar className="w-8 h-8" />
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={`${getCategoryColor(event.category)} text-white text-xs`}>
            {event.category}
          </Badge>
        </div>

        {/* Vote Count */}
        {showVoteCount && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-600 text-white text-xs">
              <Users className="w-3 h-3 mr-1" />
              {voteCount}
            </Badge>
          </div>
        )}

        {/* User Vote Indicator */}
        {userVote && (
          <div className="absolute bottom-2 right-2">
            <Badge className="bg-green-600 text-white text-xs">
              ✓ Your Vote
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Event Title */}
          <h3 className="font-semibold text-white text-lg line-clamp-2">
            {event.title}
          </h3>

          {/* Event Details */}
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(event.startDate)} at {event.startTime}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{event.venue}, {event.city}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>{formatPrice(event.price)}</span>
            </div>
          </div>

          {/* Event Description */}
          {event.description && (
            <p className="text-gray-400 text-sm line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs bg-gray-700 border-gray-600 text-gray-300">
                  #{tag}
                </Badge>
              ))}
              {event.tags.length > 3 && (
                <Badge variant="outline" className="text-xs bg-gray-700 border-gray-600 text-gray-300">
                  +{event.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {onSelect && (
              <Button
                onClick={onSelect}
                className={`flex-1 ${
                  isSelected 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white`}
              >
                {isSelected ? 'Selected' : 'Select Event'}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              onClick={() => window.open(`/events/${event.id}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
