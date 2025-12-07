"use client"

import { Badge } from "@/components/ui/badge"
import { MessageSquare, Image as ImageIcon, MessageCircle, Vote, UserCheck, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationBadgeProps {
  type: 'message' | 'photo' | 'comment' | 'vote' | 'rsvp' | 'general'
  count?: number
  pulse?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function NotificationBadge({ 
  type, 
  count, 
  pulse = false, 
  className = "",
  size = 'md'
}: NotificationBadgeProps) {
  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
    
    switch (type) {
      case 'message':
        return <MessageSquare className={iconSize} />
      case 'photo':
        return <ImageIcon className={iconSize} />
      case 'comment':
        return <MessageCircle className={iconSize} />
      case 'vote':
        return <Vote className={iconSize} />
      case 'rsvp':
        return <UserCheck className={iconSize} />
      default:
        return <Bell className={iconSize} />
    }
  }

  const getColor = () => {
    switch (type) {
      case 'message':
        return 'bg-red-500 text-white border-red-600'
      case 'photo':
        return 'bg-orange-500 text-white border-orange-600'
      case 'comment':
        return 'bg-blue-500 text-white border-blue-600'
      case 'vote':
        return 'bg-green-500 text-white border-green-600'
      case 'rsvp':
        return 'bg-purple-500 text-white border-purple-600'
      default:
        return 'bg-gray-500 text-white border-gray-600'
    }
  }

  const sizeClasses = {
    sm: 'h-5 min-w-[20px] text-[10px] px-1',
    md: 'h-6 min-w-[24px] text-xs px-1.5',
    lg: 'h-7 min-w-[28px] text-sm px-2'
  }

  return (
    <div className="relative inline-flex items-center">
      {pulse && (
        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" 
              style={{ backgroundColor: getColor().split(' ')[0].replace('bg-', '') }} />
      )}
      <Badge 
        className={cn(
          'relative flex items-center gap-1 font-semibold border-2 shadow-lg',
          getColor(),
          sizeClasses[size],
          className
        )}
      >
        {getIcon()}
        {count !== undefined && count > 0 && (
          <span className="font-bold">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Badge>
    </div>
  )
}

interface ActivityIndicatorProps {
  hangoutId: string
  newMessagesCount?: number
  newPhotosCount?: number
  newCommentsCount?: number
  needsVote?: boolean
  needsRSVP?: boolean
  className?: string
}

export function ActivityIndicator({
  hangoutId,
  newMessagesCount = 0,
  newPhotosCount = 0,
  newCommentsCount = 0,
  needsVote = false,
  needsRSVP = false,
  className = ""
}: ActivityIndicatorProps) {
  const hasActivity = newMessagesCount > 0 || newPhotosCount > 0 || newCommentsCount > 0
  const hasAction = needsVote || needsRSVP

  if (!hasActivity && !hasAction) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {needsRSVP && (
        <NotificationBadge type="rsvp" pulse={true} size="sm" />
      )}
      {needsVote && (
        <NotificationBadge type="vote" pulse={true} size="sm" />
      )}
      {newMessagesCount > 0 && (
        <NotificationBadge type="message" count={newMessagesCount} pulse={true} size="sm" />
      )}
      {newPhotosCount > 0 && (
        <NotificationBadge type="photo" count={newPhotosCount} size="sm" />
      )}
      {newCommentsCount > 0 && (
        <NotificationBadge type="comment" count={newCommentsCount} size="sm" />
      )}
    </div>
  )
}

