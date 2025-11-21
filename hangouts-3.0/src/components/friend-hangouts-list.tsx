'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MapPin, Camera, MessageSquare, Sparkles, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'
import Image from 'next/image'

interface SharedHangout {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime?: string
  endTime?: string
  createdAt: string
  lastActivityAt?: string
  photoCount: number
  commentCount: number
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

interface FriendHangoutsListProps {
  friendId: string
  currentUserId: string
}

export function FriendHangoutsList({ friendId, currentUserId }: FriendHangoutsListProps) {
  const router = useRouter()
  const [hangouts, setHangouts] = useState<SharedHangout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedHangouts()
  }, [friendId])

  const fetchSharedHangouts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/friends/${friendId}/hangouts`)
      const data = await response.json()

      if (data.success) {
        setHangouts(data.hangouts || [])
      } else {
        throw new Error(data.error || 'Failed to fetch shared hangouts')
      }
    } catch (err) {
      logger.error('Error fetching shared hangouts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load hangouts')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const hasRecentActivity = (lastActivityAt?: string) => {
    if (!lastActivityAt) return false
    const activityDate = new Date(lastActivityAt)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return activityDate > sevenDaysAgo
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
            <CardContent className="p-4">
              <div className="h-48 bg-gray-800 rounded-lg mb-4" />
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchSharedHangouts} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (hangouts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No hangouts together yet</h3>
        <p className="text-gray-400 mb-6">
          Start planning your first hangout together!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hangouts.map((hangout) => {
        const hasActivity = hasRecentActivity(hangout.lastActivityAt)
        return (
          <Card
            key={hangout.id}
            className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer"
            onClick={() => router.push(`/hangout/${hangout.id}`)}
          >
            <CardContent className="p-0">
              {/* Hangout Image */}
              {hangout.image && (
                <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                  <Image
                    src={hangout.image}
                    alt={hangout.title}
                    fill
                    className="object-cover"
                  />
                  {hasActivity && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-purple-600 text-white border-purple-500">
                        <Sparkles className="w-3 h-3 mr-1" />
                        New Activity
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4">
                {/* Title and Creator */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {hangout.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={hangout.creator.avatar} />
                        <AvatarFallback className="text-xs">
                          {hangout.creator.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>by {hangout.creator.name}</span>
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                {hangout.startTime && (
                  <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(hangout.startTime)}</span>
                    </div>
                    {formatTime(hangout.startTime) && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatTime(hangout.startTime)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Location */}
                {hangout.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{hangout.location}</span>
                  </div>
                )}

                {/* Activity Counts */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Camera className="w-4 h-4" />
                    <span>{hangout.photoCount} photos</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>{hangout.commentCount} comments</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

