"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AvatarWithGoalRingProps {
  src?: string
  alt: string
  fallback: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | null
  goalStatus?: {
    status: 'on-track' | 'approaching' | 'overdue' | 'no-goal'
    days?: number | null
    thresholdDays?: number
  }
  className?: string
}

export function AvatarWithGoalRing({
  src,
  alt,
  fallback,
  size = 'lg',
  status,
  goalStatus,
  className
}: AvatarWithGoalRingProps) {
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  }

  // Ring dimensions based on size
  const ringSizes = {
    sm: { radius: 14, strokeWidth: 2, circumference: 87.96 },
    md: { radius: 22, strokeWidth: 2.5, circumference: 137.51 },
    lg: { radius: 30, strokeWidth: 3, circumference: 188.5 },
    xl: { radius: 38, strokeWidth: 3, circumference: 238.76 }
  }

  const ringSize = ringSizes[size]

  // Calculate progress for goal ring
  const getProgressOffset = () => {
    if (!goalStatus || !goalStatus.days || !goalStatus.thresholdDays) return ringSize.circumference

    const { days, thresholdDays } = goalStatus
    if (days >= thresholdDays) return 0 // Fully filled (overdue)

    const progress = Math.max(0, Math.min(1, days / thresholdDays))
    return ringSize.circumference * (1 - progress)
  }

  // Get color based on goal status
  const getGoalRingColor = () => {
    switch (goalStatus?.status) {
      case 'on-track': return 'stroke-green-500'
      case 'approaching': return 'stroke-yellow-500'
      case 'overdue': return 'stroke-red-500'
      default: return 'stroke-gray-600'
    }
  }

  // Get pulse animation for overdue goals
  const getPulseClass = () => {
    return goalStatus?.status === 'overdue' ? 'animate-pulse' : ''
  }

  // Handle photo fallback with realistic placeholder
  const getAvatarSrc = () => {
    if (src) return src
    // Use realistic placeholder as fallback
    return `https://i.pravatar.cc/150?u=${fallback.replace(/\s+/g, '_').toLowerCase()}`
  }

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Goal Progress Ring */}
      {goalStatus && goalStatus.status !== 'no-goal' && (
        <svg
          className={cn("absolute inset-0 w-full h-full -rotate-90", getPulseClass())}
          width="100%"
          height="100%"
          viewBox={`0 0 ${ringSize.radius * 2 + ringSize.strokeWidth} ${ringSize.radius * 2 + ringSize.strokeWidth}`}
        >
          {/* Background ring */}
          <circle
            cx={ringSize.radius + ringSize.strokeWidth / 2}
            cy={ringSize.radius + ringSize.strokeWidth / 2}
            r={ringSize.radius}
            stroke="currentColor"
            strokeWidth={ringSize.strokeWidth}
            fill="transparent"
            className="text-gray-700"
          />
          {/* Progress ring */}
          <circle
            cx={ringSize.radius + ringSize.strokeWidth / 2}
            cy={ringSize.radius + ringSize.strokeWidth / 2}
            r={ringSize.radius}
            stroke="currentColor"
            strokeWidth={ringSize.strokeWidth}
            fill="transparent"
            strokeDasharray={ringSize.circumference}
            strokeDashoffset={getProgressOffset()}
            strokeLinecap="round"
            className={cn("transition-all duration-500", getGoalRingColor())}
          />
        </svg>
      )}

      {/* Avatar */}
      <Avatar className={cn(sizeClasses[size], "ring-2 ring-gray-700/50")}>
        <AvatarImage src={getAvatarSrc()} alt={alt} />
        <AvatarFallback className="bg-gray-700 text-white font-medium">
          {fallback}
        </AvatarFallback>
      </Avatar>

      {/* Status indicator */}
      {status && (
        <div
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-950",
            status === 'online' ? 'bg-green-500' : 'bg-gray-500'
          )}
        />
      )}
    </div>
  )
}