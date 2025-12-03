'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Clock, MessageCircle, UserX } from 'lucide-react'
import { FriendFrequencySelector, HangoutFrequency } from '@/components/friend-frequency-selector'
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
  desiredHangoutFrequency?: HangoutFrequency
  stats?: FriendStats
}

interface ProfileFriendsListProps {
  friends: Friendship[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onFrequencyChange: (friendshipId: string, frequency: HangoutFrequency) => void
}

export function ProfileFriendsList({ 
  friends, 
  loading, 
  error, 
  onRefresh, 
  onFrequencyChange 
}: ProfileFriendsListProps) {
  const [removingFriend, setRemovingFriend] = useState<string | null>(null)

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      setRemovingFriend(friendshipId)
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error removing friend:', error)
    } finally {
      setRemovingFriend(null)
    }
  }

  const startConversation = async (friendId: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DIRECT',
          participantIds: [friendId]
        })
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = `/messages/${data.conversation.id}`
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
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
          <Button onClick={onRefresh}>Try Again</Button>
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
            Start by searching for people to connect with
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {friends.map((friendship) => (
        <Card key={friendship.id} className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-colors">
          <CardContent className="flex items-center justify-between p-4">
            <Link 
              href={`/profile/${friendship.friend.username}`}
              className="flex items-center space-x-3 flex-1 min-w-0 group"
            >
              <Avatar className="w-12 h-12 cursor-pointer group-hover:ring-2 group-hover:ring-blue-500 transition-all flex-shrink-0">
                <AvatarImage src={friendship.friend.avatar} />
                <AvatarFallback>
                  {friendship.friend.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer">
                  {friendship.friend.name}
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer">
                  @{friendship.friend.username}
                </p>
                {friendship.friend.bio && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {friendship.friend.bio}
                  </p>
                )}
                {friendship.friend.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {friendship.friend.location}
                  </p>
                )}
                {friendship.stats && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    {friendship.stats.totalHangouts > 0 ? (
                      <>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {friendship.stats.totalHangouts} hangout{friendship.stats.totalHangouts !== 1 ? 's' : ''}
                        </span>
                        {friendship.stats.lastHangoutDate && (
                          <span>
                            Last: {new Date(friendship.stats.lastHangoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground/70">No hangouts together yet</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-end gap-2">
                <label className="text-xs font-medium text-muted-foreground">Hangout Goal</label>
                <FriendFrequencySelector
                  friendshipId={friendship.id}
                  friendId={friendship.friend.id}
                  currentFrequency={friendship.desiredHangoutFrequency || null}
                  onUpdate={(frequency) => onFrequencyChange(friendship.id, frequency)}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    startConversation(friendship.friend.id)
                  }}
                  className="px-3"
                  title="Message"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFriend(friendship.id)
                  }}
                  className="px-3"
                  title="Remove Friend"
                  disabled={removingFriend === friendship.id}
                >
                  <UserX className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}





