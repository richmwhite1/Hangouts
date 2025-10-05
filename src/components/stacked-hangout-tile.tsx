"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, MessageSquare, Clock } from "lucide-react"
import Link from "next/link"
import { ActionIndicators, ActionDot } from "./hangout/action-indicators"
import { TileActions } from "./ui/tile-actions"

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
}

export function StackedHangoutTile({ 
  hangout, 
  index, 
  totalCount, 
  showActivityIndicator = false, 
  activityType, 
  activityCount 
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
  const totalParticipants = hangout._count?.content_participants || hangout.participants?.length || 0

  // Calculate stacking offset - less stacking on mobile for better touch interaction
  const stackOffset = index * 4 // 4px offset per tile (reduced from 8px)
  const zIndex = totalCount - index // Higher z-index for tiles on top

  return (
    <Link href={`/hangout/${hangout.id}`}>
      <Card 
        className="group hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden bg-card border-border relative transform hover:scale-[1.02]"
        style={{
          transform: `translateY(${stackOffset}px)`,
          zIndex: zIndex,
          marginBottom: `${stackOffset}px`
        }}
      >
        {/* Full Image Background with Editorial Overlay */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={hangoutImage}
            alt={hangout.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              // Fallback to default image if the current image fails to load
              if (e.currentTarget.src !== '/default-hangout-friends.png') {
                e.currentTarget.src = '/default-hangout-friends.png'
              }
            }}
          />
          
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          
          {/* Top Row - Badges and Indicators */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${
                  hangout.privacyLevel === 'PUBLIC' 
                    ? 'bg-green-500/90 text-white shadow-lg' 
                    : hangout.privacyLevel === 'FRIENDS_ONLY'
                    ? 'bg-blue-500/90 text-white shadow-lg'
                    : 'bg-gray-500/90 text-white shadow-lg'
                } border-0 text-xs font-medium px-3 py-1`}
              >
                {hangout.privacyLevel === 'PUBLIC' ? 'Public' : 
                 hangout.privacyLevel === 'FRIENDS_ONLY' ? 'Friends' : 'Private'}
              </Badge>
              
              {showActivityIndicator && (
                <Badge 
                  variant="secondary" 
                  className="bg-orange-500/90 text-white shadow-lg border-0 text-xs font-medium px-3 py-1 animate-pulse"
                >
                  {activityType === 'comment' && '💬'}
                  {activityType === 'photo' && '📸'}
                  {activityType === 'rsvp' && '✋'}
                  {activityType === 'poll' && '📊'}
                  {activityCount && activityCount > 1 && ` ${activityCount}`}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <ActionDot hangout={hangout} />
              <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                {index + 1}/{totalCount}
              </div>
            </div>
          </div>

          {/* Discreet Action Buttons - Top Right */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white/80 hover:text-white"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // TODO: Navigate to chat
                console.log('Open chat for hangout:', hangout.id)
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white/80 hover:text-white"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // TODO: Handle RSVP
                console.log('RSVP to hangout:', hangout.id)
              }}
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom Content Overlay - Editorial Style */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {/* Title - Large and Bold */}
            <h3 className="text-2xl md:text-2xl text-xl font-bold mb-3 line-clamp-2 group-hover:text-yellow-300 transition-colors drop-shadow-lg">
              {hangout.title}
            </h3>
            
            {/* Action Indicators */}
            <div className="mb-3">
              <ActionIndicators hangout={hangout} />
            </div>
            
            {/* Creator Info */}
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="h-8 w-8 border-2 border-white/30">
                <AvatarImage src={(hangout.creator || hangout.users)?.avatar || "/placeholder-avatar.png"} alt={(hangout.creator || hangout.users)?.name || "Creator"} />
                <AvatarFallback className="text-sm bg-white/20 text-white">
                  {(hangout.creator || hangout.users)?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-white/90">by {(hangout.creator || hangout.users)?.name || "Unknown Creator"}</div>
                <div className="text-xs text-white/70">@{(hangout.creator || hangout.users)?.username || "unknown"}</div>
              </div>
            </div>

            {/* Event Details - Responsive Layout */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4 text-sm">
              {hangout.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-white/80 flex-shrink-0" />
                  <span className="text-white/90 line-clamp-1 text-sm">{hangout.location}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-white/80 flex-shrink-0" />
                <span className="text-white/90 text-sm">{formatDate(hangout.startTime)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-white/80 flex-shrink-0" />
                <span className="text-white/90 text-sm">{formatTime(hangout.startTime)}</span>
              </div>
            </div>

            {/* Bottom Row - Participants and Share Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-white/80" />
                  <span className="text-sm text-white/90">
                    {yesCount} going • {totalParticipants} total
                  </span>
                </div>
                
                {hangout.maxParticipants && (
                  <div className="text-xs text-white/70">
                    Max {hangout.maxParticipants}
                  </div>
                )}
              </div>
              
              {/* Share Actions - Bottom Right */}
              <div className="flex items-center space-x-2">
                <TileActions
                  itemId={hangout.id}
                  itemType="hangout"
                  onSave={(id, type) => {
                    // TODO: Implement save functionality
                    console.log('Save hangout:', id, type)
                  }}
                  onUnsave={(id, type) => {
                    // TODO: Implement unsave functionality
                    console.log('Unsave hangout:', id, type)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
