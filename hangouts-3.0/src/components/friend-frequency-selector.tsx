'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { logger } from '@/lib/logger'

export type HangoutFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUALLY' | 'SOMETIMES' | null

interface FriendFrequencySelectorProps {
  friendshipId: string
  friendId: string
  currentFrequency: HangoutFrequency
  onUpdate: (frequency: HangoutFrequency) => void
}

const frequencyOptions = [
  { value: null, label: 'No goal set' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
  { value: 'ANNUALLY', label: 'Annually' },
  { value: 'SOMETIMES', label: 'Sometimes' },
]

export function FriendFrequencySelector({ 
  friendshipId, 
  friendId, 
  currentFrequency, 
  onUpdate 
}: FriendFrequencySelectorProps) {
  const [updating, setUpdating] = useState(false)

  const handleFrequencyChange = async (value: string) => {
    const frequency = value === 'null' ? null : value as HangoutFrequency
    
    try {
      setUpdating(true)
      
      const response = await fetch(`/api/friends/${friendId}/frequency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frequency }),
      })

      if (response.ok) {
        onUpdate(frequency)
      } else {
        logger.error('Failed to update hangout frequency')
      }
    } catch (error) {
      logger.error('Error updating hangout frequency:', error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Select
      value={currentFrequency || 'null'}
      onValueChange={handleFrequencyChange}
      disabled={updating}
    >
      <SelectTrigger className="w-32 h-8 text-xs bg-gray-800 border-gray-600">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-600">
        {frequencyOptions.map((option) => (
          <SelectItem 
            key={option.value || 'null'} 
            value={option.value || 'null'}
            className="text-white hover:bg-gray-700"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}








