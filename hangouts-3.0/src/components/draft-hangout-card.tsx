"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DraftIndicator } from '@/components/draft-indicator'
import { Edit, Trash2, MapPin, Clock, Users } from 'lucide-react'
import { getOptimizedImageUrl, ImageSizes } from '@/lib/image-utils'
import Link from 'next/link'
import Image from 'next/image'

interface DraftHangout {
  id: string
  activity: string
  location: string
  selectedLocation?: {
    latitude: number
    longitude: number
    displayName: string
    address: {
      city?: string
      state?: string
      country?: string
      postcode?: string
    }
  }
  selectedDateTime?: {
    date: Date
    time: string
  }
  selectedDate?: string
  selectedTime?: string
  customDateTime?: string
  selectedFriends: string[]
  selectedGroups: string[]
  participantRoles: Record<string, { isMandatory: boolean; isCoHost: boolean }>
  privacy: 'public' | 'friends'
  allowFriendsToInvite: boolean
  isPoll: boolean
  pollSettings: {
    allowMultipleVotes: boolean
    allowSuggestions: boolean
    consensusPercentage: number
    minimumParticipants: number
  }
  rsvpSettings: {
    allowSuggestions: boolean
    hostCanEdit: boolean
    coHostCanEdit: boolean
  }
  hangoutPhoto?: {
    url: string
    filename: string
  }
  createdAt: Date
  updatedAt: Date
}

interface DraftHangoutCardProps {
  draft: DraftHangout
  onEdit: (draft: DraftHangout) => void
  onDelete: (draftId: string) => void
}

export function DraftHangoutCard({ draft, onEdit, onDelete }: DraftHangoutCardProps) {
  const getFormattedDateTime = () => {
    if (draft.selectedDateTime) {
      return draft.selectedDateTime.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"}) + ` at ${draft.selectedDateTime.time}`
    }

    if (draft.customDateTime) {
      const date = new Date(draft.customDateTime)
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"})
    }

    if (draft.selectedDate && draft.selectedTime) {
      const quickDates = [
        { id: "today", label: "Today" },
        { id: "tomorrow", label: "Tomorrow" },
        { id: "next-week", label: "Next Week" },
        { id: "next-month", label: "Next Month" },
      ]
      const quickTimes = [
        { id: "morning", label: "Morning", time: "9:00 AM" },
        { id: "afternoon", label: "Afternoon", time: "2:00 PM" },
        { id: "evening", label: "Evening", time: "7:00 PM" },
        { id: "night", label: "Night", time: "10:00 PM" },
      ]
      
      const dateLabel = quickDates.find((d) => d.id === draft.selectedDate)?.label
      const timeLabel = quickTimes.find((t) => t.id === draft.selectedTime)?.time
      return `${dateLabel} at ${timeLabel}`
    }

    return "Date not set"
  }

  const getLocationDisplay = () => {
    if (draft.selectedLocation) {
      return draft.selectedLocation.address.city && draft.selectedLocation.address.state
        ? `${draft.selectedLocation.address.city}, ${draft.selectedLocation.address.state}`
        : draft.selectedLocation.displayName
    }
    return draft.location || "Location not set"
  }

  const getParticipantsCount = () => {
    return draft.selectedFriends.length + draft.selectedGroups.length
  }

  return (
    <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-white truncate">
                {draft.activity || "Untitled Hangout"}
              </h3>
              <DraftIndicator isDraft={true} lastUpdated={draft.updatedAt} />
            </div>
            
            <div className="space-y-1 text-sm text-gray-400">
              {draft.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{getLocationDisplay()}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{getFormattedDateTime()}</span>
              </div>
              
              {getParticipantsCount() > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{getParticipantsCount()} participant{getParticipantsCount() !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Draft Image */}
          {draft.hangoutPhoto && (
            <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden ml-3">
              <Image 
                src={getOptimizedImageUrl(draft.hangoutPhoto.url, ImageSizes.thumbnail)} 
                alt="Draft" 
                className="w-full h-full object-cover" 
                width={64}
                height={64}
              />
            </div>
          )}
        </div>

        {/* Privacy and Type Badges */}
        <div className="flex items-center gap-2 mb-3">
          <Badge 
            variant="secondary" 
            className={
              draft.privacy === 'public' 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            }
          >
            {draft.privacy === 'public' ? 'Public' : 'Friends Only'}
          </Badge>
          
          {draft.isPoll && (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Poll
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            onClick={() => onEdit(draft)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Continue Editing
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
            onClick={() => onDelete(draft.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

