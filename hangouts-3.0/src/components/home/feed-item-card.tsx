'use client'

import Link from 'next/link'
import { Clock, MapPin, Users, Calendar as CalendarIcon, MessageCircle, Sparkles, Music, Coffee, Heart } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { ActivityIndicator } from '@/components/notifications/notification-badge'

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

  // Get participant count
  const participantCount = item._count?.participants || item.participants?.length || item.counts?.participants || 0

  // Get category icon for visual variety
  const getCategoryIcon = () => {
    const activity = (item.activity || item.category || '').toLowerCase()
    if (activity.includes('music') || activity.includes('concert')) return Music
    if (activity.includes('food') || activity.includes('drink') || activity.includes('coffee')) return Coffee
    return Heart
  }
  const CategoryIcon = getCategoryIcon()

  return (
    <Link href={href}>
      <div className="group relative w-full h-72 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden hover:scale-[1.02] transition-transform duration-300 cursor-pointer rounded-2xl shadow-xl mb-4">
        {/* Background Image with Overlay */}
        {item.image || item.coverImage ? (
          <>
            <OptimizedImage
              src={item.image || item.coverImage || '/placeholder-event.jpg'}
              alt={item.title}
              className="w-full h-full object-cover"
              placeholder="/placeholder-event.jpg"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
          </>
        ) : (
          <>
            {/* Colorful gradient background for items without images */}
            <div className={`absolute inset-0 ${
              isEvent 
                ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600' 
                : 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600'
            }`} />
            <div className="absolute inset-0 bg-black/30" />
            {/* Decorative icon for items without images */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <CategoryIcon className="w-48 h-48 text-white" strokeWidth={0.5} />
            </div>
          </>
        )}

        {/* Recently Updated Pulse Badge and Activity Indicators - Top Left */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {isRecentlyUpdated && updatedAtText && (
            <div className="relative">
              {/* Pulsing animation */}
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
              <Badge className="relative bg-accent text-white text-xs px-3 py-1.5 font-semibold backdrop-blur-md border-2 border-white/30 shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                New Activity
              </Badge>
            </div>
          )}
          <ActivityIndicator 
            hangoutId={item.id}
            newMessagesCount={item.newMessagesCount}
            newPhotosCount={item.newPhotosCount}
            newCommentsCount={item.newCommentsCount}
            needsVote={item.needsVote}
            needsRSVP={item.needsRSVP}
          />
        </div>

        {/* Type Badge - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <Badge className={`
            text-white text-xs px-3 py-1.5 font-semibold backdrop-blur-md border-2 border-white/30 shadow-lg
            ${isEvent 
              ? 'bg-indigo-600/90 hover:bg-indigo-700/90' 
              : 'bg-cyan-600/90 hover:bg-cyan-700/90'
            }
          `}>
            <CalendarIcon className="w-3 h-3 mr-1" />
            {isEvent ? 'Event' : 'Hangout'}
          </Badge>
        </div>

        {/* Main Content - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
          {/* Title */}
          <h3 className="font-bold text-white text-2xl line-clamp-2 drop-shadow-2xl leading-tight">
            {item.title}
          </h3>

          {/* Meta Info Grid */}
          <div className="flex flex-wrap gap-3 text-sm">
            {/* Date & Time */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
              <Clock className="w-3.5 h-3.5 text-white/90" />
              <span className="text-white/90 font-medium">{formattedDate}</span>
            </div>

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 max-w-[200px]">
                <MapPin className="w-3.5 h-3.5 text-white/90 flex-shrink-0" />
                <span className="text-white/90 font-medium truncate">{item.location}</span>
              </div>
            )}

            {/* Participants */}
            {participantCount > 0 && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
                <Users className="w-3.5 h-3.5 text-white/90" />
                <span className="text-white/90 font-medium">{participantCount} going</span>
              </div>
            )}
          </div>

          {/* RSVP Status Bar */}
          {item.myRsvpStatus && item.myRsvpStatus !== 'PENDING' && (
            <div className="pt-2">
              <div className={`
                inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full shadow-lg border-2
                ${item.myRsvpStatus === 'YES' 
                  ? 'bg-green-500 text-white border-green-300' 
                  : item.myRsvpStatus === 'MAYBE'
                  ? 'bg-amber-500 text-white border-amber-300'
                  : 'bg-red-500 text-white border-red-300'
                }
              `}>
                <div className={`w-2 h-2 rounded-full ${
                  item.myRsvpStatus === 'YES' ? 'bg-white' : 'bg-white/70'
                } animate-pulse`}></div>
                You're {item.myRsvpStatus === 'YES' ? 'Going' : item.myRsvpStatus === 'MAYBE' ? 'Interested' : 'Not Going'}
              </div>
            </div>
          )}

          {/* Updated timestamp - subtle */}
          {isRecentlyUpdated && updatedAtText && (
            <div className="text-white/60 text-xs font-medium flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Updated {updatedAtText}
            </div>
          )}
        </div>

        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 pointer-events-none" />
      </div>
    </Link>
  )
}
