'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MapPin, Camera, MessageSquare, Sparkles, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'
import Image from 'next/image'

interface SharedHangout {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime?: string
  endTime?: string
  createdAt: string
  lastActivityAt?: string
  photoCount: number
  commentCount: number
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

interface SharedEvent {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime?: string
  endTime?: string
  createdAt: string
  lastActivityAt?: string
  photoCount: number
  commentCount: number
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

interface FriendHangoutsListProps {
  friendId: string
  currentUserId: string
}

type ActivityItem = (SharedHangout | SharedEvent) & { type: 'hangout' | 'event' }

export function FriendHangoutsList({ friendId, currentUserId }: FriendHangoutsListProps) {
  const router = useRouter()
  const [hangouts, setHangouts] = useState<SharedHangout[]>([])
  const [events, setEvents] = useState<SharedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedActivities()
  }, [friendId])

  const fetchSharedActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch both hangouts and events in parallel
      const [hangoutsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/friends/${friendId}/hangouts`),
        fetch(`/api/friends/${friendId}/events`)
      ])

      const hangoutsData = await hangoutsResponse.json()
      const eventsData = await eventsResponse.json()

      if (hangoutsData.success) {
        setHangouts(hangoutsData.hangouts || [])
      } else {
        throw new Error(hangoutsData.error || 'Failed to fetch shared hangouts')
      }

      if (eventsData.success) {
        setEvents(eventsData.events || [])
      } else {
        // Don't throw error for events, just log it
        logger.warn('Failed to fetch shared events:', eventsData.error)
      }
    } catch (err) {
      logger.error('Error fetching shared activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  // Combine and sort activities by date
  const activities: ActivityItem[] = [
    ...hangouts.map(h => ({ ...h, type: 'hangout' as const })),
    ...events.map(e => ({ ...e, type: 'event' as const }))
  ].sort((a, b) => {
    const dateA = a.startTime ? new Date(a.startTime).getTime() : new Date(a.createdAt).getTime()
    const dateB = b.startTime ? new Date(b.startTime).getTime() : new Date(b.createdAt).getTime()
    return dateB - dateA // Most recent first
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const hasRecentActivity = (lastActivityAt?: string) => {
    if (!lastActivityAt) return false
    const activityDate = new Date(lastActivityAt)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return activityDate > sevenDaysAgo
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
            <CardContent className="p-4">
              <div className="h-48 bg-gray-800 rounded-lg mb-4" />
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchSharedHangouts} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No activities together yet</h3>
        <p className="text-gray-400 mb-6">
          Start planning your first hangout or event together!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const hasActivity = hasRecentActivity(activity.lastActivityAt)
        const isEvent = activity.type === 'event'
        return (
          <Card
            key={activity.id}
            className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer"
            onClick={() => router.push(`/${isEvent ? 'event' : 'hangout'}/${activity.id}`)}
          >
            <CardContent className="p-0">
              {/* Activity Image */}
              {activity.image && (
                <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                  <Image
                    src={activity.image}
                    alt={activity.title}
                    fill
                    className="object-cover"
                  />
                  {hasActivity && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-purple-600 text-white border-purple-500">
                        <Sparkles className="w-3 h-3 mr-1" />
                        New Activity
                      </Badge>
                    </div>
                  )}
                  {isEvent && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-blue-600 text-white border-blue-500">
                        Event
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4">
                {/* Title and Creator */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {activity.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={activity.creator.avatar} />
                        <AvatarFallback className="text-xs">
                          {activity.creator.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>by {activity.creator.name}</span>
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                {activity.startTime && (
                  <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(activity.startTime)}</span>
                    </div>
                    {formatTime(activity.startTime) && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatTime(activity.startTime)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Location */}
                {activity.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{activity.location}</span>
                  </div>
                )}

                {/* Activity Counts */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Camera className="w-4 h-4" />
                    <span>{activity.photoCount} photos</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>{activity.commentCount} comments</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

