'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getTimeElapsedInfo, getStatusColorClasses, getStatusLabel, type RelationshipStatus } from '@/lib/friend-relationship-utils'
import { HangoutFrequency } from '@/lib/services/relationship-reminder-service'
import { Clock } from 'lucide-react'

interface TimeElapsedIndicatorProps {
  lastHangoutDate?: string | Date | null
  frequency?: HangoutFrequency | null
  showProgress?: boolean
  showBadge?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TimeElapsedIndicator({
  lastHangoutDate,
  frequency,
  showProgress = false,
  showBadge = true,
  size = 'md'
}: TimeElapsedIndicatorProps) {
  const info = getTimeElapsedInfo(lastHangoutDate, frequency || null)
  const statusColorClasses = getStatusColorClasses(info.status)
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  const progressPercentage = info.thresholdDays && info.days !== null
    ? Math.min(100, (info.days / info.thresholdDays) * 100)
    : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 ${sizeClasses[size]}`}>
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-white">{info.text}</span>
        </div>
        {showBadge && info.status !== 'no-goal' && (
          <Badge 
            variant="outline" 
            className={`${statusColorClasses} ${sizeClasses.sm} font-medium`}
          >
            {getStatusLabel(info.status)}
          </Badge>
        )}
      </div>
      
      {showProgress && info.status !== 'no-goal' && info.thresholdDays && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {info.status === 'overdue' 
                ? `Overdue by ${info.days! - info.thresholdDays} days`
                : info.status === 'approaching'
                ? `${info.daysUntilThreshold} days until reminder`
                : `${info.thresholdDays - (info.days || 0)} days remaining`
              }
            </span>
            <span>{info.thresholdDays} day goal</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700">
            <div 
              className={`h-full transition-all ${
                info.status === 'overdue' 
                  ? 'bg-red-500' 
                  : info.status === 'approaching'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
        </div>
      )}
      
      {info.status === 'approaching' && info.daysUntilThreshold !== undefined && (
        <p className="text-xs text-yellow-400">
          Reminder will trigger in {info.daysUntilThreshold} day{info.daysUntilThreshold !== 1 ? 's' : ''}
        </p>
      )}
      
      {info.status === 'overdue' && (
        <p className="text-xs text-red-400">
          Time to reconnect! You've exceeded your goal.
        </p>
      )}
    </div>
  )
}

