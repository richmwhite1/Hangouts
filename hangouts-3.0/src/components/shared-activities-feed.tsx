'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'
import { StackedHangoutTile } from '@/components/stacked-hangout-tile'
import { logger } from '@/lib/logger'
import type { SharedHangout, SharedEvent } from '@/lib/services/friend-relationship-service'

interface SharedActivitiesFeedProps {
  friendId: string
  currentUserId?: string | null
}

type ActivityItem = {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  type: 'hangout' | 'event'
  startTime: string
  endTime: string
  hasRecentActivity: boolean
  activityType: 'comment' | 'photo'
  activityCount: number
  _count: {
    participants: number
    messages: number
  }
}

export function SharedActivitiesFeed({ friendId }: SharedActivitiesFeedProps) {
  const [hangouts, setHangouts] = useState<SharedHangout[]>([])
  const [events, setEvents] = useState<SharedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (friendId) {
      fetchSharedActivities()
    }
  }, [friendId])

  const fetchSharedActivities = async () => {
    try {
      setLoading(true)
      setError(null)

      const [hangoutsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/friends/${friendId}/hangouts`),
        fetch(`/api/friends/${friendId}/events`)
      ])

      if (hangoutsResponse.ok) {
        const hangoutsData = await hangoutsResponse.json()
        if (hangoutsData.success) {
          setHangouts(hangoutsData.hangouts || [])
        } else {
          setHangouts([])
        }
      } else {
        throw new Error('Failed to fetch shared hangouts')
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        if (eventsData.success) {
          setEvents(eventsData.events || [])
        } else {
          setEvents([])
        }
      } else {
        logger.warn('SharedActivitiesFeed: events request failed with status', eventsResponse.status)
      }
    } catch (err) {
      logger.error('Error fetching shared activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load shared activities')
    } finally {
      setLoading(false)
    }
  }

  const transformHangout = (hangout: SharedHangout): ActivityItem => {
    const start = hangout.startTime ? new Date(hangout.startTime).toISOString() : new Date().toISOString()
    const end = hangout.endTime ? new Date(hangout.endTime).toISOString() : start
    const lastActivity = hangout.lastActivityAt ? new Date(hangout.lastActivityAt) : null
    const hasRecentActivity = lastActivity ? (Date.now() - lastActivity.getTime()) < 7 * 24 * 60 * 60 * 1000 : false

    const activity: ActivityItem = {
      id: hangout.id,
      title: hangout.title,
      creator: hangout.creator,
      type: 'hangout',
      startTime: start,
      endTime: end,
      hasRecentActivity,
      activityType: 'comment',
      activityCount: hangout.commentCount + hangout.photoCount,
      _count: {
        participants: 0,
        messages: hangout.commentCount
      }
    }

    if (hangout.description) {
      activity.description = hangout.description
    }
    if (hangout.image) {
      activity.image = hangout.image
    }
    if (hangout.location) {
      activity.location = hangout.location
    }

    return activity
  }

  const transformEvent = (event: SharedEvent): ActivityItem => {
    const start = event.startTime ? new Date(event.startTime).toISOString() : new Date().toISOString()
    const end = event.endTime ? new Date(event.endTime).toISOString() : start
    const lastActivity = event.lastActivityAt ? new Date(event.lastActivityAt) : null
    const hasRecentActivity = lastActivity ? (Date.now() - lastActivity.getTime()) < 7 * 24 * 60 * 60 * 1000 : false

    const activity: ActivityItem = {
      id: event.id,
      title: event.title,
      creator: event.creator,
      type: 'event',
      startTime: start,
      endTime: end,
      hasRecentActivity,
      activityType: 'comment',
      activityCount: event.commentCount + event.photoCount,
      _count: {
        participants: 0,
        messages: event.commentCount
      }
    }

    if (event.description) {
      activity.description = event.description
    }
    if (event.image) {
      activity.image = event.image
    }
    if (event.location) {
      activity.location = event.location
    }

    return activity
  }

  const allActivities = useMemo(() => {
    const combined = [
      ...hangouts.map(transformHangout),
      ...events.map(transformEvent)
    ]

    return combined.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [hangouts, events])

  const upcomingActivities = allActivities.filter(activity => new Date(activity.endTime || activity.startTime) >= new Date())
  const pastActivities = allActivities.filter(activity => new Date(activity.endTime || activity.startTime) < new Date())

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
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchSharedActivities} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (allActivities.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <History className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No shared activities yet</h3>
          <p className="text-gray-400 mb-6">
            You haven't attended any hangouts or events together.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {upcomingActivities.map((activity, index) => (
        <StackedHangoutTile
          key={`${activity.id}-${activity.type}-upcoming`}
          hangout={activity as any}
          index={index}
          totalCount={upcomingActivities.length + pastActivities.length}
          showActivityIndicator={activity.hasRecentActivity}
          activityType={activity.activityType}
          activityCount={activity.activityCount}
          type={activity.type}
        />
      ))}

      {pastActivities.length > 0 && (
        <div className="py-2 text-center text-xs uppercase tracking-wide text-gray-500">
          Past activities
        </div>
      )}

      {pastActivities.map((activity, index) => (
        <StackedHangoutTile
          key={`${activity.id}-${activity.type}-past`}
          hangout={activity as any}
          index={upcomingActivities.length + index}
          totalCount={upcomingActivities.length + pastActivities.length}
          showActivityIndicator={activity.hasRecentActivity}
          activityType={activity.activityType}
          activityCount={activity.activityCount}
          type={activity.type}
        />
      ))}
    </div>
  )
}


