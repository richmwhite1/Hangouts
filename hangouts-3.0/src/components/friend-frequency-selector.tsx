'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export type HangoutFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUALLY' | 'SOMETIMES' | null

interface FriendFrequencySelectorProps {
  friendshipId: string
  friendId: string
  currentFrequency: HangoutFrequency
  onUpdate?: (frequency: HangoutFrequency) => void
}

const frequencyLabels: Record<HangoutFrequency, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUALLY: 'Annually',
  SOMETIMES: 'Sometimes',
  null: 'None'
}

const frequencyDescriptions: Record<HangoutFrequency, string> = {
  MONTHLY: 'Remind me every month',
  QUARTERLY: 'Remind me every 3 months',
  SEMI_ANNUAL: 'Remind me every 6 months',
  ANNUALLY: 'Remind me every year',
  SOMETIMES: 'Occasional reminders',
  null: 'No reminders'
}

export function FriendFrequencySelector({
  friendshipId,
  friendId,
  currentFrequency,
  onUpdate
}: FriendFrequencySelectorProps) {
  const [frequency, setFrequency] = useState<HangoutFrequency>(currentFrequency)
  const [updating, setUpdating] = useState(false)

  const handleFrequencyChange = async (newFrequency: string) => {
    const freqValue = newFrequency === 'none' ? null : (newFrequency as HangoutFrequency)
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/friends/${friendId}/frequency`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ frequency: freqValue })
      })

      if (response.ok) {
        setFrequency(freqValue)
        toast.success(`Reminder frequency updated to ${frequencyLabels[freqValue] || 'None'}`)
        if (onUpdate) {
          onUpdate(freqValue)
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update frequency')
      }
    } catch (error) {
      logger.error('Error updating frequency:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update frequency')
      // Revert to previous value
      setFrequency(currentFrequency)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={frequency || 'none'}
        onValueChange={handleFrequencyChange}
        disabled={updating}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <SelectValue placeholder="Frequency" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="MONTHLY">Monthly</SelectItem>
          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
          <SelectItem value="SEMI_ANNUAL">Semi-Annual</SelectItem>
          <SelectItem value="ANNUALLY">Annually</SelectItem>
          <SelectItem value="SOMETIMES">Sometimes</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

