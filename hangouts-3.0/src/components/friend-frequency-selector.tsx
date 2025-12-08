'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

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
    
    // Validate friendId before making request
    if (!friendId || friendId === 'undefined' || friendId === 'null') {
      const errorMsg = 'Invalid friend ID. Please refresh the page and try again.'
      logger.error('Invalid friendId in frequency selector', { friendId, friendshipId })
      toast.error(errorMsg)
      return
    }
    
    try {
      setUpdating(true)
      
      const response = await fetch(`/api/friends/${friendId}/frequency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frequency }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onUpdate(frequency)
        const frequencyLabel = frequencyOptions.find(opt => opt.value === frequency)?.label || 'No goal set'
        toast.success(`Hangout goal set to ${frequencyLabel}`)
        logger.info('Successfully updated hangout frequency', { friendId, frequency })
      } else {
        const errorMessage = data.error || data.message || 'Failed to update hangout frequency'
        logger.error('Failed to update hangout frequency', { 
          friendId, 
          frequency, 
          error: errorMessage,
          responseStatus: response.status,
          responseData: data
        })
        toast.error(errorMessage)
        // Revert the select value on error
        // The Select component will handle this via its controlled value
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update hangout frequency'
      logger.error('Error updating hangout frequency:', { 
        error, 
        friendId, 
        friendshipId,
        errorMessage 
      })
      toast.error(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const selectValue = currentFrequency === null ? 'null' : currentFrequency

  return (
    <Select
      value={selectValue}
      onValueChange={handleFrequencyChange}
      disabled={updating}
      key={`${friendId}-${selectValue}`} // Force re-render when value changes
    >
      <SelectTrigger className="w-32 h-8 text-xs bg-gray-800 border-gray-600">
        <SelectValue placeholder="Select goal..." />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-600">
        {frequencyOptions.map((option) => (
          <SelectItem 
            key={option.value || 'null'} 
            value={option.value === null ? 'null' : option.value}
            className="text-white hover:bg-gray-700"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}








