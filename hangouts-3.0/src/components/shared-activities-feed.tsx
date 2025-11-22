'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StackedHangoutTile } from './stacked-hangout-tile'
import { logger } from '@/lib/logger'
import { SharedHangout, SharedEvent } from '@/lib/services/friend-relationship-service'

interface SharedActivitiesFeedProps {
  friendId: string
  currentUserId: string
}

interface ActivityItem {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator?: {
    name: string
    username: string
    avatar?: string
  }
  users?: {
    name: string
    username: string
    avatar?: string
  }
  participants?: Array<{
    id: string
    user: {
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: "YES" | "NO" | "MAYBE" | "PENDING"
  }>
  _count?: {
    participants: number
    messages: number
  }
  privacyLevel?: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE"
  maxParticipants?: number
  image?: string
  photos?: string[]
  type: 'hangout' | 'event'
  hasRecentActivity?: boolean
  activityType?: 'comment' | 'photo' | 'rsvp' | 'poll'
  activityCount?: number
}

export function SharedActivitiesFeed({ friendId, currentUserId }: SharedActivitiesFeedProps) {
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
        // Convert date strings to Date objects if needed
        const processedHangouts = (hangoutsData.hangouts || []).map((h: any) => ({
          ...h,
          startTime: h.startTime ? (typeof h.startTime === 'string' ? new Date(h.startTime) : h.startTime) : undefined,
          endTime: h.endTime ? (typeof h.endTime === 'string' ? new Date(h.endTime) : h.endTime) : undefined,
          createdAt: h.createdAt ? (typeof h.createdAt === 'string' ? new Date(h.createdAt) : h.createdAt) : new Date(),
          lastActivityAt: h.lastActivityAt ? (typeof h.lastActivityAt === 'string' ? new Date(h.lastActivityAt) : h.lastActivityAt) : undefined
        }))
        setHangouts(processedHangouts)
      } else {
        throw new Error(hangoutsData.error || 'Failed to fetch shared hangouts')
      }

      if (eventsData.success) {
        // Convert date strings to Date objects if needed
        const processedEvents = (eventsData.events || []).map((e: any) => ({
          ...e,
          startTime: e.startTime ? (typeof e.startTime === 'string' ? new Date(e.startTime) : e.startTime) : undefined,
          endTime: e.endTime ? (typeof e.endTime === 'string' ? new Date(e.endTime) : e.endTime) : undefined,
          createdAt: e.createdAt ? (typeof e.createdAt === 'string' ? new Date(e.createdAt) : e.createdAt) : new Date(),
          lastActivityAt: e.lastActivityAt ? (typeof e.lastActivityAt === 'string' ? new Date(e.lastActivityAt) : e.lastActivityAt) : undefined
        }))
        setEvents(processedEvents)
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

  // Transform shared hangout to activity item
  const transformHangout = (hangout: SharedHangout): ActivityItem => {
    const now = new Date()
    const startDate = hangout.startTime ? (hangout.startTime instanceof Date ? hangout.startTime : new Date(hangout.startTime)) : null
    const lastActivityDate = hangout.lastActivityAt 
      ? (hangout.lastActivityAt instanceof Date ? hangout.lastActivityAt : new Date(hangout.lastActivityAt))
      : null
    const hasRecentActivity = lastActivityDate 
      ? lastActivityDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : false

    const startTimeStr = hangout.startTime 
      ? (hangout.startTime instanceof Date ? hangout.startTime.toISOString() : hangout.startTime)
      : new Date().toISOString()
    const endTimeStr = hangout.endTime 
      ? (hangout.endTime instanceof Date ? hangout.endTime.toISOString() : hangout.endTime)
      : new Date().toISOString()

    return {
      id: hangout.id,
      title: hangout.title,
      description: hangout.description,
      location: hangout.location,
      startTime: startTimeStr,
      endTime: endTimeStr,
      creator: hangout.creator,
      users: hangout.creator, // For compatibility
      image: hangout.image,
      photos: hangout.image ? [hangout.image] : undefined,
      type: 'hangout',
      privacyLevel: 'FRIENDS_ONLY', // Shared hangouts are typically friends-only
      _count: {
        participants: 2, // Both users are participants
        messages: hangout.commentCount || 0
      },
      hasRecentActivity,
      activityType: hasRecentActivity ? (hangout.commentCount > 0 ? 'comment' : 'photo') : undefined,
      activityCount: hasRecentActivity ? (hangout.commentCount || hangout.photoCount || 0) : undefined
    }
  }

  // Transform shared event to activity item
  const transformEvent = (event: SharedEvent): ActivityItem => {
    const now = new Date()
    const startDate = event.startTime ? (event.startTime instanceof Date ? event.startTime : new Date(event.startTime)) : null
    const lastActivityDate = event.lastActivityAt 
      ? (event.lastActivityAt instanceof Date ? event.lastActivityAt : new Date(event.lastActivityAt))
      : null
    const hasRecentActivity = lastActivityDate 
      ? lastActivityDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : false

    const startTimeStr = event.startTime 
      ? (event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime)
      : new Date().toISOString()
    const endTimeStr = event.endTime 
      ? (event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime)
      : new Date().toISOString()

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: startTimeStr,
      endTime: endTimeStr,
      creator: event.creator,
      users: event.creator, // For compatibility
      image: event.image,
      photos: event.image ? [event.image] : undefined,
      type: 'event',
      privacyLevel: 'PUBLIC', // Events are typically public
      _count: {
        participants: 2, // Both users are participants
        messages: event.commentCount || 0
      },
      hasRecentActivity,
      activityType: hasRecentActivity ? (event.commentCount > 0 ? 'comment' : 'photo') : undefined,
      activityCount: hasRecentActivity ? (event.commentCount || event.photoCount || 0) : undefined
    }
  }

  // Combine and sort activities by date
  const activities: ActivityItem[] = [
    ...hangouts.map(transformHangout),
    ...events.map(transformEvent)
  ].sort((a, b) => {
    const dateA = new Date(a.startTime).getTime()
    const dateB = new Date(b.startTime).getTime()
    return dateB - dateA // Most recent first
  })

  // Separate upcoming and past activities
  const now = new Date()
  const upcomingActivities = activities.filter(activity => {
    const startDate = new Date(activity.startTime)
    return startDate >= now
  })
  const pastActivities = activities.filter(activity => {
    const startDate = new Date(activity.startTime)
    return startDate < now
  })

  const totalVisible = activities.length

  if (loading) {
    return (
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#121212] border border-[#262626] rounded-lg mb-4 animate-pulse">
            <div className="h-64 bg-[#1a1a1a]" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-[#1a1a1a] rounded w-3/4" />
              <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={fetchSharedActivities} 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (totalVisible === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No activities together yet</h3>
        <p className="text-gray-400 mb-6">
          Start planning your first hangout or event together!
        </p>
        <Link href={`/create?with=${friendId}`}>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Plan Your First Hangout
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {upcomingActivities.map((activity, index) => (
        <StackedHangoutTile
          key={`${activity.id}-upcoming`}
          hangout={activity as any}
          index={index}
          totalCount={totalVisible}
          showActivityIndicator={!!activity.hasRecentActivity}
          activityType={activity.activityType}
          activityCount={activity.activityCount}
          type={activity.type}
        />
      ))}
      {pastActivities.length > 0 && (
        <div className="py-4 text-center text-xs uppercase tracking-wide text-gray-500">
          Past activities
        </div>
      )}
      {pastActivities.map((activity, index) => (
        <StackedHangoutTile
          key={`${activity.id}-past`}
          hangout={activity as any}
          index={upcomingActivities.length + index}
          totalCount={totalVisible}
          showActivityIndicator={!!activity.hasRecentActivity}
          activityType={activity.activityType}
          activityCount={activity.activityCount}
          type={activity.type}
        />
      ))}
    </div>
  )
}

