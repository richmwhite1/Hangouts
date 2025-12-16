'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserPlus, CheckCircle, Clock } from 'lucide-react'

interface RecentActivity {
  id: string
  type: 'join' | 'rsvp'
  user: {
    name: string
    avatar?: string
  }
  timestamp: Date
  action: string
}

interface RecentActivityFeedProps {
  hangoutId: string
  maxItems?: number
  className?: string
}

/**
 * Shows recent activity on a hangout to build social proof and urgency
 * Displays who recently joined or RSVP'd to encourage conversions
 */
export function RecentActivityFeed({ 
  hangoutId, 
  maxItems = 3,
  className = ''
}: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In production, this would fetch real activity data
    // For now, showing example implementation
    fetchRecentActivity()
  }, [hangoutId])

  const fetchRecentActivity = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement actual API call
      // const response = await fetch(`/api/hangouts/${hangoutId}/recent-activity`)
      // const data = await response.json()
      // setActivities(data.activities)
      
      // Example data structure for demonstration
      const mockActivities: RecentActivity[] = []
      setActivities(mockActivities)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Don't show if no activities or still loading
  if (isLoading || activities.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Clock className="w-4 h-4" />
        <span>Recent Activity</span>
      </div>

      <div className="space-y-2">
        {activities.slice(0, maxItems).map((activity) => (
          <div 
            key={activity.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {activity.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                <span className="font-medium">{activity.user.name}</span>
                <span className="text-gray-400 ml-1">{activity.action}</span>
              </p>
              <p className="text-xs text-gray-500">
                {getTimeAgo(activity.timestamp)}
              </p>
            </div>

            <div>
              {activity.type === 'join' && (
                <UserPlus className="w-4 h-4 text-blue-400" />
              )}
              {activity.type === 'rsvp' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      {activities.length > maxItems && (
        <p className="text-xs text-gray-500 text-center">
          +{activities.length - maxItems} more recently joined
        </p>
      )}
    </div>
  )
}












