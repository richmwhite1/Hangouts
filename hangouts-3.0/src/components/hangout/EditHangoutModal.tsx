'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Edit, X } from 'lucide-react'
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface EditHangoutModalProps {
  hangout: {
    id: string
    title: string
    description?: string
    location?: string
    latitude?: number
    longitude?: number
    startTime: string
    endTime: string
    privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
    image?: string
    maxParticipants?: number
    weatherEnabled?: boolean
    state?: string
    options?: Array<{
      id: string
      title: string
      description?: string
      location?: string
      dateTime?: string
      price?: number
    }>
  }
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedHangout: any) => void
}

export default function EditHangoutModal({ 
  hangout, 
  isOpen, 
  onClose, 
  onUpdate 
}: EditHangoutModalProps) {
  const { getToken } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (formData: NewHangoutFormData) => {
    try {
      setIsUpdating(true)
      
      // Validate required fields
      if (!formData.title.trim()) {
        toast.error('Title is required')
        return
      }

      // Extract dateTime from first option - ensure it's properly formatted
      let newStartTime = hangout.startTime
      if (formData.options && formData.options.length > 0 && formData.options[0]?.dateTime) {
        const dateTimeValue = formData.options[0].dateTime
        // Ensure it's a valid date string (ISO format)
        if (dateTimeValue && dateTimeValue.trim() !== '') {
          try {
            // Validate the date by creating a Date object
            const dateObj = new Date(dateTimeValue)
            if (!isNaN(dateObj.getTime())) {
              newStartTime = dateObj.toISOString()
            } else {
              logger.warn('Invalid dateTime in form data, using original startTime', { dateTimeValue })
            }
          } catch (error) {
            logger.error('Error parsing dateTime:', error)
          }
        }
      }
      
      // Calculate endTime based on startTime (default to 3 hours later)
      let newEndTime = hangout.endTime
      if (newStartTime !== hangout.startTime) {
        try {
          const startDate = new Date(newStartTime)
          const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000) // 3 hours later
          newEndTime = endDate.toISOString()
        } catch (error) {
          logger.error('Error calculating endTime:', error)
        }
      }

      // Prepare update data
      const updateData = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        privacyLevel: formData.privacyLevel,
        startTime: newStartTime,
        endTime: newEndTime,
        maxParticipants: hangout.maxParticipants,
        weatherEnabled: hangout.weatherEnabled
      }
      
      logger.info('Updating hangout with data:', {
        hangoutId: hangout.id,
        startTime: newStartTime,
        endTime: newEndTime,
        location: formData.location
      })

      // Get token for authentication
      const token = await getToken()
      if (!token) {
        toast.error('Authentication required. Please sign in.')
        return
      }

      // Update hangout
      const response = await fetch(`/api/hangouts/${hangout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      const responseData = await response.json()

      if (responseData.success) {
        toast.success('Hangout updated successfully!')
        onUpdate(responseData.data)
        onClose()
      } else {
        toast.error(responseData.error || 'Failed to update hangout')
      }
    } catch (error) {
      logger.error('Error updating hangout:', error);
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700" style={{ pointerEvents: 'auto' }}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Hangout Details
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="mt-4">
          <NewHangoutForm
            onSubmit={handleUpdate}
            isLoading={isUpdating}
            prefillEvent={{
              id: hangout.id,
              title: hangout.title,
              description: hangout.description || '',
              location: hangout.location || '',
              dateTime: hangout.startTime, // This will be used to prefill the first option's dateTime
              price: 0,
              options: hangout.options && hangout.options.length > 0 
                ? hangout.options.map(opt => ({
                    ...opt,
                    dateTime: opt.dateTime || hangout.startTime // Ensure each option has dateTime
                  }))
                : [{
                    id: `option_${Date.now()}_1`,
                    title: hangout.title,
                    description: hangout.description || '',
                    location: hangout.location || '',
                    dateTime: hangout.startTime, // Use hangout's startTime as default
                    price: 0,
                    hangoutUrl: ''
                  }]
            }}
            isEditMode={true}
            hangoutState={hangout.state}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
