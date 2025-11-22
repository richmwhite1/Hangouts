"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, MessageSquare, Clock, Heart, Share2 } from "lucide-react"
import Link from "next/link"
import { ActionIndicators, ActionDot } from "./hangout/action-indicators"
import { TileActions } from "./ui/tile-actions"

import { logger } from '@/lib/logger'
interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator?: {
    name: string
    username: string
    avatar?: string
  }
  users?: {
    name: string
    username: string
    avatar?: string
  }
  participants?: Array<{
    id: string
    user: {
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: "YES" | "NO" | "MAYBE" | "PENDING"
  }>
  _count?: {
    participants: number
    messages: number
  }
  privacyLevel?: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE"
  maxParticipants?: number
  image?: string
  photos?: string[]
}

interface StackedHangoutTileProps {
  hangout: Hangout
  index: number
  totalCount: number
  showActivityIndicator?: boolean
  activityType?: 'comment' | 'photo' | 'rsvp' | 'poll'
  activityCount?: number
  type?: 'hangout' | 'event'
}

export function StackedHangoutTile({ 
  hangout, 
  index, 
  totalCount, 
  showActivityIndicator = false, 
  activityType, 
  activityCount,
  type = 'hangout'
}: StackedHangoutTileProps) {
  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Use the specific default image you requested
  const hangoutImage = hangout.image || hangout.photos?.[0] || "/default-hangout-friends.png"
  const yesCount = hangout.participants?.filter(p => p.rsvpStatus === "YES").length || 0
  const totalParticipants = hangout._count?.participants || hangout.participants?.length || 0

  // Calculate stacking offset - less stacking on mobile for better touch interaction
  const stackOffset = index * 4 // 4px offset per tile (reduced from 8px)
  const zIndex = totalCount - index // Higher z-index for tiles on top

  // Determine route based on type
  const route = type === 'event' ? `/event/${hangout.id}` : `/hangout/${hangout.id}`

  return (
    <Link href={route}>
      <Card 
        className="group transition-all duration-300 cursor-pointer overflow-hidden bg-[#121212] border-[#262626] rounded-lg fade-in"
      >
        {/* Header - Creator Info */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={(hangout.creator || hangout.users)?.avatar || "/placeholder-avatar.png"} alt={(hangout.creator || hangout.users)?.name || "Creator"} />
              <AvatarFallback>
                {(hangout.creator || hangout.users)?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#FAFAFA]">
                {(hangout.creator || hangout.users)?.name || "Unknown"}
              </span>
              <span className="text-xs text-[#A8A8A8]">
                {formatDate(hangout.startTime)} • {formatTime(hangout.startTime)}
              </span>
            </div>
          </div>
          
          <Badge 
            variant="secondary" 
            className={`text-xs font-medium px-2 py-1 ${
              hangout.privacyLevel === 'PUBLIC' 
                ? 'bg-[#1a1a1a] text-[#34D399]' 
                : hangout.privacyLevel === 'FRIENDS_ONLY'
                ? 'bg-[#1a1a1a] text-[#0095F6]'
                : 'bg-[#1a1a1a] text-[#A8A8A8]'
            }`}
          >
            {hangout.privacyLevel === 'PUBLIC' ? 'Public' : 
             hangout.privacyLevel === 'FRIENDS_ONLY' ? 'Friends' : 'Private'}
          </Badge>
        </div>

        {/* Instagram-style Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#000000]">
          <img
            src={hangoutImage}
            alt={hangout.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              if (e.currentTarget.src !== '/default-hangout-friends.png') {
                e.currentTarget.src = '/default-hangout-friends.png'
              }
            }}
          />
          
          {type === 'event' && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-blue-600 text-white border-0 text-xs font-medium px-2 py-1">
                Event
              </Badge>
            </div>
          )}
          {showActivityIndicator && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-orange-500 text-white border-0 text-xs font-medium px-2 py-1">
                {activityType === 'comment' && '💬'}
                {activityType === 'photo' && '📸'}
                {activityType === 'rsvp' && '✋'}
                {activityType === 'poll' && '📊'}
                {activityCount && activityCount > 1 && ` ${activityCount}`}
              </Badge>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 text-[#FAFAFA] hover:bg-[#1a1a1a]"
            >
              <Heart className="h-6 w-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 text-[#FAFAFA] hover:bg-[#1a1a1a]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 text-[#FAFAFA] hover:bg-[#1a1a1a]"
            >
              <Share2 className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Participant Count */}
          {totalParticipants > 0 && (
            <div className="flex items-center space-x-2 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src="/placeholder-avatar.png" alt="Participant" />
                <AvatarFallback className="text-xs">U</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-[#FAFAFA]">
                {yesCount > 0 ? `${yesCount} going` : `${totalParticipants} participants`}
              </span>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="px-4 pb-4">
          {/* Title */}
          <h3 className="text-base font-semibold text-[#FAFAFA] mb-1">
            {hangout.title}
          </h3>
          
          {/* Description */}
          {hangout.description && (
            <p className="text-sm text-[#A8A8A8] line-clamp-2 mb-2">
              {hangout.description}
            </p>
          )}
          
        </div>
      </Card>
    </Link>
  )
}
