'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { getStatusColorClasses, getStatusLabel } from '@/lib/friend-relationship-utils'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

interface UpcomingReminder {
  friendshipId: string
  friend: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  frequency: string
  thresholdDays: number
  daysSince: number | null
  daysUntilThreshold: number
  status: 'on-track' | 'approaching' | 'overdue' | 'no-goal'
  lastHangoutDate: string | null
}

export function UpcomingRemindersWidget() {
  const router = useRouter()
  const [reminders, setReminders] = useState<UpcomingReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/friends/upcoming-reminders')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReminders(data.reminders || [])
        }
      }
    } catch (error) {
      logger.error('Error fetching upcoming reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-700 rounded w-1/2" />
            <div className="h-16 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reminders.length === 0) {
    return null
  }

  return (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          Friends to Reconnect With
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.slice(0, 5).map((reminder) => (
          <div
            key={reminder.friendshipId}
            className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="w-10 h-10">
                <AvatarImage src={reminder.friend.avatar} />
                <AvatarFallback>
                  {reminder.friend.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">
                    {reminder.friend.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={`${getStatusColorClasses(reminder.status)} text-xs`}
                  >
                    {getStatusLabel(reminder.status)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {reminder.status === 'overdue'
                    ? `Overdue by ${reminder.daysSince! - reminder.thresholdDays} days`
                    : reminder.daysUntilThreshold === 0
                    ? 'Reminder due today'
                    : `${reminder.daysUntilThreshold} day${reminder.daysUntilThreshold !== 1 ? 's' : ''} until reminder`
                  }
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/create?friendId=${reminder.friend.id}`)}
              className="ml-2 bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Plan
            </Button>
          </div>
        ))}
        {reminders.length > 5 && (
          <p className="text-xs text-gray-400 text-center pt-2">
            +{reminders.length - 5} more friend{reminders.length - 5 !== 1 ? 's' : ''} need attention
          </p>
        )}
      </CardContent>
    </Card>
  )
}

