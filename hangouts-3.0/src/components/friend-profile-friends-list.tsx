'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface Friend {
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

interface Friendship {
  id: string
  friend: Friend
  status: string
  createdAt: string
  desiredHangoutFrequency?: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUALLY' | 'SOMETIMES' | null
  stats: FriendStats
}

interface FriendProfileFriendsListProps {
  userId: string
}

const frequencyLabels: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUALLY: 'Annually',
  SOMETIMES: 'Sometimes',
}

export function FriendProfileFriendsList({ userId }: FriendProfileFriendsListProps) {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFriends()
  }, [userId])

  const fetchFriends = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/users/${userId}/friends`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch friends'}`)
      }
      
      const data = await response.json()

      if (data.success) {
        setFriends(data.friends || [])
      } else {
        throw new Error(data.error || data.message || 'Failed to fetch friends')
      }
    } catch (err) {
      logger.error('Error fetching user friends:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load friends'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatLastHangout = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months !== 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} year${years !== 1 ? 's' : ''} ago`
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
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Friends</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchFriends} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    )
  }

  if (friends.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-white mb-2">No friends yet</h3>
          <p className="text-gray-400">
            This user hasn't added any friends yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {friends.map((friendship) => (
        <Card key={friendship.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <Link href={`/profile/${friendship.friend.username}`}>
                  <Avatar className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                    <AvatarImage src={friendship.friend.avatar} />
                    <AvatarFallback>
                      {friendship.friend.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${friendship.friend.username}`}>
                    <h3 className="font-semibold text-white hover:text-blue-400 transition-colors cursor-pointer">
                      {friendship.friend.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400">@{friendship.friend.username}</p>
                  
                  {friendship.friend.bio && (
                    <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                      {friendship.friend.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {friendship.stats.totalHangouts > 0 ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{friendship.stats.totalHangouts} hangout{friendship.stats.totalHangouts !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Last: {formatLastHangout(friendship.stats.lastHangoutDate)}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">No hangouts together yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hangout goal frequency is private - not shown when viewing someone else's friends */}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

