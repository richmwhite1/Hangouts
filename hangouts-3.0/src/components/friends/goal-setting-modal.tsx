"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { AvatarWithGoalRing } from "./avatar-with-goal-ring"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HangoutFrequency } from '@/lib/services/relationship-reminder-service'
import { RelationshipStatus } from '@/lib/friend-relationship-utils'

interface GoalSettingModalProps {
  isOpen: boolean
  onClose: () => void
  friendId: string
  friendName: string
  friendAvatar?: string | undefined
  currentFrequency: HangoutFrequency | null
  lastHangoutDate: Date | null
  goalStatus: RelationshipStatus
  onSave: (frequency: HangoutFrequency | null) => Promise<void>
}

interface FrequencyOption {
  value: HangoutFrequency
  label: string
  emoji: string
  description: string
  days: number
  recommended?: boolean
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    value: 'MONTHLY',
    label: 'Monthly',
    emoji: '☕',
    description: 'Catch up once a month',
    days: 30
  },
  {
    value: 'QUARTERLY',
    label: 'Quarterly',
    emoji: '📅',
    description: 'Get together every 3 months',
    days: 90
  },
  {
    value: 'SEMI_ANNUAL',
    label: 'Semi-Annual',
    emoji: '🗓️',
    description: 'Twice a year hangouts',
    days: 180
  },
  {
    value: 'ANNUALLY',
    label: 'Annually',
    emoji: '🎊',
    description: 'Yearly catch-ups',
    days: 365
  },
  {
    value: 'SOMETIMES',
    label: 'Sometimes',
    emoji: '🌟',
    description: 'Occasional, no pressure',
    days: 90
  }
]

export function GoalSettingModal({
  isOpen,
  onClose,
  friendId,
  friendName,
  friendAvatar,
  currentFrequency,
  lastHangoutDate,
  goalStatus,
  onSave
}: GoalSettingModalProps) {
  const [selectedFrequency, setSelectedFrequency] = useState<HangoutFrequency | null>(currentFrequency)
  const [isSaving, setIsSaving] = useState(false)

  // Suggest appropriate frequency based on last hangout
  const getSuggestedFrequency = (): HangoutFrequency => {
    if (!lastHangoutDate) return 'MONTHLY' // Default for new friendships

    const daysSince = Math.ceil((Date.now() - new Date(lastHangoutDate).getTime()) / (1000 * 60 * 60 * 24))

    if (daysSince <= 45) return 'MONTHLY'
    if (daysSince <= 120) return 'QUARTERLY'
    if (daysSince <= 200) return 'SEMI_ANNUAL'
    return 'ANNUALLY'
  }

  // Mark recommended option
  const suggestedFrequency = getSuggestedFrequency()
  const optionsWithRecommendations = FREQUENCY_OPTIONS.map(option => ({
    ...option,
    recommended: option.value === suggestedFrequency
  }))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(selectedFrequency)
      onClose()
    } catch (error) {
      console.error('Error saving goal:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveGoal = async () => {
    setSelectedFrequency(null)
    setIsSaving(true)
    try {
      await onSave(null)
      onClose()
    } catch (error) {
      console.error('Error removing goal:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatLastHangout = () => {
    if (!lastHangoutDate) return "Never hung out"
    const days = Math.ceil((Date.now() - new Date(lastHangoutDate).getTime()) / (1000 * 60 * 60 * 24))

    if (days === 0) return "Hung out today"
    if (days === 1) return "Hung out yesterday"
    if (days < 30) return `Hung out ${days} days ago`
    if (days < 365) return `Hung out ${Math.floor(days / 30)} months ago`
    return `Hung out ${Math.floor(days / 365)} years ago`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AvatarWithGoalRing
              src={friendAvatar}
              alt={friendName}
              fallback={friendName.charAt(0).toUpperCase()}
              size="sm"
            />
            <div>
              <h3 className="text-lg font-semibold">Set Hangout Goal</h3>
              <p className="text-sm text-gray-400">with {friendName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Current Status</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  goalStatus === 'on-track' && "bg-green-500/20 text-green-400",
                  goalStatus === 'approaching' && "bg-yellow-500/20 text-yellow-400",
                  goalStatus === 'overdue' && "bg-red-500/20 text-red-400",
                  goalStatus === 'no-goal' && "bg-gray-500/20 text-gray-400"
                )}
              >
                {goalStatus === 'no-goal' ? 'No Goal Set' :
                 goalStatus === 'on-track' ? 'On Track' :
                 goalStatus === 'approaching' ? 'Due Soon' : 'Overdue'}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">{formatLastHangout()}</p>
          </div>

          {/* Frequency Options */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">How often would you like to hang out?</h4>
            <div className="space-y-2">
              {optionsWithRecommendations.map((option) => (
                <Card
                  key={option.value}
                  className={cn(
                    "p-3 cursor-pointer transition-all border-gray-700 hover:border-gray-600",
                    selectedFrequency === option.value
                      ? "border-magenta-500 bg-magenta-500/10"
                      : "bg-gray-800/50"
                  )}
                  onClick={() => setSelectedFrequency(option.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{option.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{option.label}</span>
                          {option.recommended && (
                            <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{option.description}</p>
                      </div>
                    </div>
                    {selectedFrequency === option.value && (
                      <Check className="w-4 h-4 text-magenta-400" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Remove Goal Option */}
          {currentFrequency && (
            <div className="pt-2 border-t border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveGoal}
                disabled={isSaving}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 w-full"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Remove Goal
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-magenta-600 hover:bg-magenta-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Goal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}