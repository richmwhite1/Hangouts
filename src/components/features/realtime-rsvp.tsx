"use client"

import { memo, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle, XCircle, HelpCircle, Users } from 'lucide-react'
import { useRealtimeRSVP } from '@/hooks/use-realtime-hangouts'
import { useSocket } from '@/contexts/socket-context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface RealtimeRSVPProps {
  hangoutId: string
  currentUserRSVP?: string
  onRSVPChange?: (status: string) => void
  className?: string
}

export const RealtimeRSVP = memo(function RealtimeRSVP({ 
  hangoutId, 
  currentUserRSVP,
  onRSVPChange,
  className 
}: RealtimeRSVPProps) {
  const [rsvpStatus, setRsvpStatus] = useState(currentUserRSVP || 'PENDING')
  const { rsvpUpdates, updateRSVP, isConnected } = useRealtimeRSVP(hangoutId)
  const { socket } = useSocket()

  // Group RSVP updates by status
  const rsvpCounts = rsvpUpdates.reduce((acc, update) => {
    acc[update.status] = (acc[update.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Handle RSVP status change
  const handleRSVPChange = useCallback((status: string) => {
    setRsvpStatus(status)
    updateRSVP(status)
    onRSVPChange?.(status)
  }, [updateRSVP, onRSVPChange])

  // Get recent RSVP updates (last 10)
  const recentUpdates = rsvpUpdates.slice(-10).reverse()

  const rsvpOptions = [
    { value: 'YES', label: 'Going', icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    { value: 'NO', label: 'Not Going', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    { value: 'MAYBE', label: 'Maybe', icon: HelpCircle, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  ]

  return (
    <div className={cn("space-y-4", className)}>
      {/* RSVP Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">RSVP Status</h3>
        <div className="flex space-x-2">
          {rsvpOptions.map((option) => {
            const Icon = option.icon
            const isSelected = rsvpStatus === option.value
            const count = rsvpCounts[option.value] || 0

            return (
              <Button
                key={option.value}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleRSVPChange(option.value)}
                disabled={!isConnected}
                className={cn(
                  "flex-1 justify-start",
                  isSelected && option.color
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {option.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="text-sm text-muted-foreground">
          <Badge variant="outline" className="mr-2">
            Disconnected
          </Badge>
          RSVP updates will sync when reconnected
        </div>
      )}

      {/* Recent RSVP Updates */}
      {recentUpdates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Recent Updates
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentUpdates.map((update, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {(update.user as { name?: string })?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{(update.user as { name?: string })?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      update.status === 'YES' && "border-green-500 text-green-700",
                      update.status === 'NO' && "border-red-500 text-red-700",
                      update.status === 'MAYBE' && "border-yellow-500 text-yellow-700"
                    )}
                  >
                    {update.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(update.timestamp, 'HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
