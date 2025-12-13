"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface HangoutGoalIndicatorProps {
  lastHangoutDate?: string | Date | null
  desiredFrequency?: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUALLY' | 'SOMETIMES' | null
  className?: string
}

export function HangoutGoalIndicator({ 
  lastHangoutDate, 
  desiredFrequency,
  className = ""
}: HangoutGoalIndicatorProps) {
  if (!desiredFrequency) return null

  const getFrequencyDays = (freq: string) => {
    switch (freq) {
      case 'MONTHLY': return 30
      case 'QUARTERLY': return 90
      case 'SEMI_ANNUAL': return 180
      case 'ANNUALLY': return 365
      case 'SOMETIMES': return 90
      default: return 30
    }
  }

  const getDaysSince = () => {
    if (!lastHangoutDate) return null
    const now = new Date()
    const lastHangout = new Date(lastHangoutDate)
    const diffTime = Math.abs(now.getTime() - lastHangout.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const thresholdDays = getFrequencyDays(desiredFrequency)
  const daysSince = getDaysSince()
  const daysUntilReminder = daysSince ? thresholdDays - daysSince : thresholdDays

  const getStatus = () => {
    if (!daysSince) {
      return {
        type: 'neutral',
        label: `Goal: ${desiredFrequency.toLowerCase()}`,
        icon: Clock,
        color: 'bg-blue-100 text-blue-700 border-blue-300'
      }
    }

    if (daysSince >= thresholdDays) {
      return {
        type: 'overdue',
        label: `${daysSince - thresholdDays} days overdue`,
        icon: AlertTriangle,
        color: 'bg-red-100 text-red-700 border-red-300'
      }
    }

    if (daysSince >= thresholdDays * 0.8) {
      return {
        type: 'warning',
        label: `${daysUntilReminder} days left`,
        icon: Clock,
        color: 'bg-orange-100 text-orange-700 border-orange-300'
      }
    }

    return {
      type: 'good',
      label: `${daysUntilReminder} days left`,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700 border-green-300'
    }
  }

  const status = getStatus()
  const Icon = status.icon

  return (
    <Badge 
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium border px-2 py-1",
        status.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {status.label}
    </Badge>
  )
}





