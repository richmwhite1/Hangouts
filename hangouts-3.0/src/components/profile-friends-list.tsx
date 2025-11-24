'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MessageCircle, UserX, Clock } from 'lucide-react'
import Link from 'next/link'
import { FriendFrequencySelector, HangoutFrequency } from '@/components/friend-frequency-selector'
import { logger } from '@/lib/logger'
import { useState } from 'react'

interface FriendUser {
  id: string
  username: string
  name: string
  avatar?: string
  bio?: string
  location?: string
}

interface FriendStats {
  lastHangoutDate?: string
  totalHangouts: number
  invitedCount: number
  wasInvitedCount: number
}

export interface Friendship {
  id: string
  friend: FriendUser
  status: string
  createdAt: string
  desiredHangoutFrequency?: HangoutFrequency
  stats: FriendStats
}

interface ProfileFriendsListProps {
  friends: Friendship[]
  loading: boolean
  error?: string | null
  onRefresh?: () => void
  onFrequencyChange?: (friendshipId: string, frequency: HangoutFrequency | null) => void
}

const frequencyLabels: Record<Exclude<HangoutFrequency, null>, string> = {
  MONTHLY: 'Monthly reminders',
  QUARTERLY: 'Quarterly reminders',
  SEMI_ANNUAL: 'Semi-annual reminders',
  ANNUALLY: 'Annual reminders',
  SOMETIMES: 'Occasional reminders'
}

export function ProfileFriendsList({
  friends,
  loading,
  error,
  onRefresh,
  onFrequencyChange
}: ProfileFriendsListProps) {
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null)

  const formatLastHangout = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      setRemovingFriendId(friendshipId)
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove friend')
      }

      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      logger.error('Error removing friend:', err)
    } finally {
      setRemovingFriendId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                  <div className="h-3 bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={onRefresh} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (friends.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">No friends yet</h3>
          <p className="text-gray-400 mb-4">
            You haven't added any friends yet. Visit the friends page to get started.
          </p>
          <Button onClick={() => (window.location.href = '/friends')}>
            Find Friends
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {friends.map((friendship) => (
        <Card key={friendship.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
          <CardContent className="flex items-start justify-between p-4 gap-4">
            <Link 
              href={`/profile/${friendship.friend.username}`}
              className="flex items-start gap-4 flex-1 min-w-0 group"
            >
              <Avatar className="w-12 h-12 group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                <AvatarImage src={friendship.friend.avatar} />
                <AvatarFallback>
                  {friendship.friend.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {friendship.friend.name}
                </h3>
                <p className="text-sm text-gray-400">@{friendship.friend.username}</p>

                {friendship.friend.bio && (
                  <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                    {friendship.friend.bio}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 flex-wrap">
                  {friendship.stats.totalHangouts > 0 ? (
                    <>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {friendship.stats.totalHangouts} hangout{friendship.stats.totalHangouts !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last: {formatLastHangout(friendship.stats.lastHangoutDate)}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500">No hangouts together yet</span>
                  )}
                </div>
              </div>
            </Link>

            <div className="flex flex-col items-end gap-3 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-end gap-2">
                <label className="text-xs font-medium text-gray-400">Hangout Goal</label>
                <FriendFrequencySelector
                  friendshipId={friendship.id}
                  friendId={friendship.friend.id}
                  currentFrequency={friendship.desiredHangoutFrequency || null}
                  onUpdate={(frequency) => {
                    if (onFrequencyChange) {
                      onFrequencyChange(friendship.id, frequency)
                    }
                  }}
                />
                {friendship.desiredHangoutFrequency && (
                  <Badge variant="outline" className="text-xs bg-gray-900/50 border-gray-600 text-gray-200">
                    {frequencyLabels[friendship.desiredHangoutFrequency] || 'Custom'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = `/messages/new?user=${friendship.friend.username}`)}
                  className="px-3"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFriend(friendship.id)}
                  className="px-3"
                  disabled={removingFriendId === friendship.id}
                >
                  <UserX className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


