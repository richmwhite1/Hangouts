"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvatarWithGoalRing } from "./avatar-with-goal-ring"
import { MessageSquare, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { EnhancedFriend } from "./types"

interface FriendCardEnhancedProps {
  friend: EnhancedFriend
  onMessage: () => void
  onInvite: () => void
  onSetGoal?: () => void
  className?: string
}

export function FriendCardEnhanced({
  friend,
  onMessage,
  onInvite,
  onSetGoal,
  className
}: FriendCardEnhancedProps) {
  const {
    name,
    username,
    avatar,
    goalStatus,
    hangoutStats,
    upcomingHangouts,
    desiredHangoutFrequency
  } = friend

  // Format goal display text
  const getGoalDisplayText = () => {
    if (!desiredHangoutFrequency) {
      return null
    }

    const frequencyLabels = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMI_ANNUAL: 'Semi-Annual',
      ANNUALLY: 'Annually',
      SOMETIMES: 'Sometimes'
    }

    return frequencyLabels[desiredHangoutFrequency] || desiredHangoutFrequency
  }

  // Format goal status display (for additional context)
  const getGoalStatusDisplay = () => {
    if (!desiredHangoutFrequency) {
      return null
    }

    switch (goalStatus.status) {
      case 'on-track':
        return `✅ On Track`
      case 'approaching':
        return `⚠️ Due in ${goalStatus.daysUntilThreshold} days`
      case 'overdue':
        return `🔴 ${goalStatus.days} days overdue`
      default:
        return null
    }
  }

  // Format last hangout
  const getLastHangoutDisplay = () => {
    if (hangoutStats.lastHangout) {
      const hangout = hangoutStats.lastHangout
      return `⏰ ${hangout.title} · ${goalStatus.text}`
    } else if (goalStatus.days !== null) {
      return `⏰ Last hangout: ${goalStatus.text}`
    } else {
      return `⏰ Never hung out`
    }
  }

  // Format upcoming hangouts
  const getUpcomingDisplay = () => {
    if (upcomingHangouts.length === 0) return null

    if (upcomingHangouts.length === 1) {
      const hangout = upcomingHangouts[0]
      const date = new Date(hangout.startTime!)
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      return `📅 ${hangout.title} · ${formattedDate}`
    } else {
      return `📅 ${upcomingHangouts.length} upcoming hangouts`
    }
  }

  // Get card color scheme based on goal status
  const getCardColorClasses = () => {
    switch (goalStatus.status) {
      case 'overdue':
        return 'border-red-500/30 bg-red-500/5'
      case 'approaching':
        return 'border-yellow-500/30 bg-yellow-500/5'
      case 'on-track':
        return 'border-green-500/30 bg-green-500/5'
      case 'no-goal':
      default:
        return 'border-gray-700/50 bg-gray-800/50'
    }
  }

  return (
    <Card className={cn("transition-all duration-200 hover:bg-gray-800/70", getCardColorClasses(), className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with goal ring */}
          <AvatarWithGoalRing
            src={avatar}
            alt={name}
            fallback={name.charAt(0).toUpperCase()}
            size="lg"
            status={friend.isActive ? 'online' : 'offline'}
            goalStatus={goalStatus.status !== 'no-goal' ? goalStatus : undefined}
            className="flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-lg truncate">
                  {name}
                </h3>
                <p className="text-sm text-gray-400 truncate">
                  @{username}
                </p>
              </div>
            </div>

            {/* Activity Info */}
            <div className="space-y-1 mb-3">
              {/* Goal Status */}
              {desiredHangoutFrequency ? (
                <button
                  onClick={onSetGoal}
                  className="text-xs text-magenta-400 hover:text-magenta-300 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="font-medium">Hangout goal: {getGoalDisplayText()}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                  {getGoalStatusDisplay() && (
                    <span className="text-gray-400 ml-1">· {getGoalStatusDisplay()}</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={onSetGoal}
                  className="text-xs text-magenta-400 hover:text-magenta-300 transition-colors flex items-center gap-1"
                >
                  <span>Set hangout goal</span>
                  <span>🎯</span>
                </button>
              )}

              {/* Last Hangout */}
              <p className="text-xs text-gray-400">
                {getLastHangoutDisplay()}
              </p>

              {/* Upcoming Plans */}
              {getUpcomingDisplay() && (
                <p className="text-xs text-gray-400">
                  {getUpcomingDisplay()}
                </p>
              )}

              {/* Celebration message for recent hangouts */}
              {goalStatus.status === 'on-track' && goalStatus.days !== null && goalStatus.days <= 3 && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span>🎉</span>
                  <span>You hung out recently!</span>
                </p>
              )}

              {/* Gentle nudge for overdue */}
              {goalStatus.status === 'overdue' && goalStatus.days !== null && goalStatus.days > 7 && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <span>☕</span>
                  <span>It's been a while - time to catch up?</span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMessage}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onInvite}
                className="text-magenta-400 hover:text-magenta-300 hover:bg-magenta-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}