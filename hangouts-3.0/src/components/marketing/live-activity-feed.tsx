'use client'

import { useEffect, useState } from 'react'
import { MapPin, Users, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Activity {
  id: string
  title: string
  location?: string
  city?: string
  participants: number
  timeAgo: string
  type: 'hangout' | 'event'
}

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const response = await fetch('/api/public/recent-activity?limit=10')
        const data = await response.json()
        
        if (data.success) {
          setActivities(data.activities || [])
        }
      } catch (error) {
        console.error('Error fetching activity:', error)
        // Fallback to mock data for demonstration
        setActivities([
          { id: '1', title: 'Coffee meetup', location: 'Brooklyn', city: 'Brooklyn', participants: 4, timeAgo: '2 min ago', type: 'hangout' },
          { id: '2', title: 'Weekend hike', location: 'Austin', city: 'Austin', participants: 6, timeAgo: '5 min ago', type: 'hangout' },
          { id: '3', title: 'Game night', location: 'San Francisco', city: 'San Francisco', participants: 8, timeAgo: '12 min ago', type: 'hangout' },
          { id: '4', title: 'Dinner plans', location: 'Seattle', city: 'Seattle', participants: 5, timeAgo: '18 min ago', type: 'hangout' },
          { id: '5', title: 'Beach day', location: 'Los Angeles', city: 'Los Angeles', participants: 12, timeAgo: '25 min ago', type: 'hangout' },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentActivity()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-900 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF1493] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF1493]"></span>
        </div>
        <span className="text-sm font-semibold text-[#FF1493]">Live Activity</span>
      </div>

      {/* Scrolling activity feed */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent pr-2">
        {activities.map((activity, index) => (
          <Card
            key={activity.id}
            className="bg-gradient-to-r from-gray-900 to-black border-gray-800 hover:border-[#FF1493]/30 transition-all duration-300 p-4 group hover:scale-[1.02] animate-fadeIn"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-lg mb-1 truncate">{activity.title}</h4>
                <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                  {activity.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {activity.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {activity.participants} going
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    {activity.timeAgo}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  activity.type === 'hangout' 
                    ? 'bg-[#FF1493]/10 text-[#FF1493] border border-[#FF1493]/30' 
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                }`}>
                  {activity.type}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  )
}
