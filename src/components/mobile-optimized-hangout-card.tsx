"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, MessageSquare, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator: {
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

interface MobileHangoutCardProps {
  hangout: Hangout
}

export function MobileHangoutCard({ hangout }: MobileHangoutCardProps) {
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

  // Get default image based on category or use placeholder
  const getDefaultImage = () => {
    // You can add logic here to select different default images based on hangout type
    const defaultImages = [
      "/board-games-on-table-with-friends.jpg",
      "/coffee-group.jpg",
      "/camera-group.jpg",
      "/mountain-hiking-trail.jpg",
      "/modern-coffee-shop.png",
      "/ultimate-gaming-setup.png"
    ]
    return defaultImages[Math.floor(Math.random() * defaultImages.length)]
  }

  const hangoutImage = hangout.image || hangout.photos?.[0] || getDefaultImage()
  const yesCount = hangout.participants?.filter(p => p.rsvpStatus === "YES").length || 0
  const totalParticipants = hangout._count?.participants || hangout.participants?.length || 0

  return (
    <Link href={`/hangout/${hangout.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-card border-border relative">
        {/* Image Section */}
        <div className="relative aspect-square">
          <Image
            src={hangoutImage}
            alt={hangout.title}
            fill
            className="object-cover"
            unoptimized="true"
          />
          
          {/* Privacy Badge */}
          <div className="absolute top-3 left-3">
            <Badge 
              variant="secondary" 
              className={`${
                hangout.privacyLevel === 'PUBLIC' 
                  ? 'bg-green-500/90 text-white' 
                  : hangout.privacyLevel === 'FRIENDS_ONLY'
                  ? 'bg-blue-500/90 text-white'
                  : 'bg-gray-500/90 text-white'
              } border-0 text-xs`}
            >
              {hangout.privacyLevel === 'PUBLIC' ? 'Public' : 
               hangout.privacyLevel === 'FRIENDS_ONLY' ? 'Friends' : 'Private'}
            </Badge>
          </div>

          {/* Creator Avatar */}
          <div className="absolute top-3 right-3">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={hangout.creator.avatar || "/placeholder-avatar.png"} alt={hangout.creator.name} />
              <AvatarFallback className="text-xs">{hangout.creator.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Title and Description Overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white font-bold text-lg text-balance mb-1 line-clamp-2">
              {hangout.title}
            </h3>
            {hangout.description && (
              <p className="text-white/90 text-sm line-clamp-2">{hangout.description}</p>
            )}
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Date and Time */}
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">
                {formatDate(hangout.startTime)} at {formatTime(hangout.startTime)}
              </span>
            </div>

            {/* Location */}
            {hangout.location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{hangout.location}</span>
              </div>
            )}

            {/* Participants and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Participant Avatars */}
                <div className="flex -space-x-2">
                  {hangout.participants?.slice(0, 3).map((participant, index) => (
                    <div key={participant.id} className="relative">
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarImage 
                          src={participant.user.avatar || "/placeholder.svg"} 
                          alt={participant.user.name} 
                        />
                        <AvatarFallback className="text-xs">
                          {participant.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-background ${
                          participant.rsvpStatus === 'YES' ? 'bg-green-500' :
                          participant.rsvpStatus === 'NO' ? 'bg-red-500' :
                          participant.rsvpStatus === 'MAYBE' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}
                      />
                    </div>
                  ))}
                  {totalParticipants > 3 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">+{totalParticipants - 3}</span>
                    </div>
                  )}
                </div>
                
                {/* Participant Count */}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{yesCount} going</span>
                  {hangout.maxParticipants && (
                    <span className="ml-1">/ {hangout.maxParticipants}</span>
                  )}
                </div>
              </div>

              {/* Chat Button */}
              <Button variant="ghost" size="sm" className="relative">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
