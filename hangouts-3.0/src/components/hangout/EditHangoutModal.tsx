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

      // Prepare update data
      const updateData = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        privacyLevel: formData.privacyLevel,
        startTime: formData.options[0]?.dateTime || hangout.startTime,
        endTime: hangout.endTime, // Keep original end time for now
        maxParticipants: hangout.maxParticipants,
        weatherEnabled: hangout.weatherEnabled
      }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
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
              dateTime: hangout.startTime,
              price: 0
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
