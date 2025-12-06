'use client'

import Link from 'next/link'
import { Clock, MapPin, Users, Calendar as CalendarIcon, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FeedItemCardProps {
  item: any
  showUpdatedBadge?: boolean
}

export function FeedItemCard({ item, showUpdatedBadge = false }: FeedItemCardProps) {
  if (!item || !item.id) {
    return null
  }
  
  const isEvent = item.type === 'EVENT'
  const href = isEvent ? `/event/${item.id}` : `/hangout/${item.id}`
  
  // Format time
  const startTime = item.startTime ? new Date(item.startTime) : new Date()
  const formattedDate = startTime.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
  const formattedTime = startTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })

  // Calculate if recently updated
  let isRecentlyUpdated = false
  let updatedAtText = ''
  if (showUpdatedBadge && item.updatedAt) {
    try {
      const updatedAt = new Date(item.updatedAt)
      if (!isNaN(updatedAt.getTime())) {
        const timeSinceUpdate = Date.now() - updatedAt.getTime()
        isRecentlyUpdated = timeSinceUpdate < 24 * 60 * 60 * 1000 // 24 hours
        if (isRecentlyUpdated) {
          updatedAtText = formatDistanceToNow(updatedAt, { addSuffix: true })
        }
      }
    } catch (e) {
      // Ignore date parsing errors
    }
  }

  return (
    <Link href={href}>
      <div className="group relative bg-white rounded-xl p-4 shadow-planner hover:shadow-planner-md transition-all duration-300 border border-planner-border/50 overflow-hidden mb-3">
        {/* Left Accent Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isEvent ? 'bg-planner-navy' : 'bg-accent'
        }`} />

        {/* Recently Updated Badge */}
        {isRecentlyUpdated && updatedAtText && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2 py-1 rounded-full">
              <MessageCircle className="w-3 h-3" />
              Updated {updatedAtText}
            </span>
          </div>
        )}

        <div className="flex items-start gap-4 pl-2">
          {/* Image/Icon */}
          {item.image ? (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-planner-tab">
              <img 
                src={item.image} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`flex-shrink-0 w-20 h-20 rounded-lg flex items-center justify-center ${
              isEvent ? 'bg-planner-navy/10' : 'bg-accent/10'
            }`}>
              <CalendarIcon className={`w-8 h-8 ${
                isEvent ? 'text-planner-navy' : 'text-accent'
              }`} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-planner-text-primary text-lg leading-tight line-clamp-2">
                {item.title}
              </h3>
              {!isRecentlyUpdated && (
                <span className={`
                  flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full
                  ${isEvent
                    ? 'bg-planner-navy/10 text-planner-navy'
                    : 'bg-accent/10 text-accent'
                  }
                `}>
                  {isEvent ? 'Event' : 'Hangout'}
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-sm text-planner-text-secondary">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-planner-text-muted flex-shrink-0" />
                <span className="font-medium">{formattedDate} • {formattedTime}</span>
              </div>

              {item.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-planner-text-muted flex-shrink-0" />
                  <span className="line-clamp-1">{item.location}</span>
                </div>
              )}

              {(item._count?.participants || item.participants?.length || item.counts?.participants) && (
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-planner-text-muted flex-shrink-0" />
                  <span>
                    {item._count?.participants || item.participants?.length || item.counts?.participants || 0} attending
                  </span>
                </div>
              )}
            </div>

            {/* RSVP Status */}
            {item.myRsvpStatus && item.myRsvpStatus !== 'PENDING' && (
              <div className="mt-2">
                <span className={`
                  inline-flex text-xs font-medium px-2 py-1 rounded-full
                  ${item.myRsvpStatus === 'YES' 
                    ? 'bg-green-100 text-green-700' 
                    : item.myRsvpStatus === 'MAYBE'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }
                `}>
                  You're {item.myRsvpStatus === 'YES' ? 'going' : item.myRsvpStatus === 'MAYBE' ? 'interested' : 'not going'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
