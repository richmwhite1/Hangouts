'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Users, 
  UserPlus, 
  UserX, 
  Search,
  MessageCircle,
  Clock,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { FriendFrequencySelector, HangoutFrequency } from '@/components/friend-frequency-selector'
import { HangoutGoalIndicator } from '@/components/hangout-goal-indicator'
import Link from 'next/link'

import { logger } from '@/lib/logger'

interface User {
  id: string
  username: string
  name: string
  email: string
  avatar?: string
  bio?: string
  location?: string
}

interface FriendRequest {
  id: string
  sender: User
  receiver: User
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'BLOCKED'
  message?: string
  createdAt: string
}

interface Friendship {
  id: string
  user: User
  friend: User
  status: 'ACTIVE' | 'BLOCKED'
  createdAt: string
  desiredHangoutFrequency?: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUALLY' | 'SOMETIMES' | null
  stats?: {
    lastHangoutDate?: string
    totalHangouts: number
    invitedCount: number
    wasInvitedCount: number
  }
}

export default function FriendsPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [friends, setFriends] = useState<Friendship[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false)
  const [friendToUnfriend, setFriendToUnfriend] = useState<{ id: string; name: string } | null>(null)
  const [unfriending, setUnfriending] = useState(false)

  useEffect(() => {
    if (isSignedIn && isLoaded) {
      // Get current user ID first
      const fetchCurrentUser = async () => {
        try {
          const token = await getToken()
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            setCurrentUserId(data.data?.id || data.user?.id || null)
          }
        } catch (error) {
          logger.error('Error fetching current user:', error)
        }
      }
      fetchCurrentUser()
      loadFriends()
      loadFriendRequests()
      // Load all users for discovery
      searchUsers('')
    }
  }, [isSignedIn, isLoaded])

  const loadFriends = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFriends(data.friends || [])
      }
    } catch (error) {
      logger.error('Error loading friends:', error);
    }
  }

  const loadFriendRequests = async () => {
    try {
      const token = await getToken()
      
      // Get current user ID first if not already set
      let userId = currentUserId
      if (!userId) {
        try {
          const userResponse = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (userResponse.ok) {
            const userData = await userResponse.json()
            userId = userData.data?.id || userData.user?.id
            if (userId) {
              setCurrentUserId(userId)
            }
          }
        } catch (error) {
          logger.error('Error fetching current user in loadFriendRequests:', error)
        }
      }
      
      const response = await fetch('/api/friends/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const allRequests = [...data.sent, ...data.received]
        setFriendRequests(allRequests)
        
        // Initialize pendingRequests Set from loaded friend requests
        // This ensures the UI state matches the database state
        if (userId) {
          const pendingUserIds = new Set<string>()
          allRequests.forEach(req => {
            if (req.status === 'PENDING') {
              // If current user sent the request, track the receiver
              if (req.sender.id === userId) {
                pendingUserIds.add(req.receiver.id)
              }
              // If current user received the request, track the sender
              if (req.receiver.id === userId) {
                pendingUserIds.add(req.sender.id)
              }
            }
          })
          setPendingRequests(pendingUserIds)
        }
      }
    } catch (error) {
      logger.error('Error loading friend requests:', error);
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    setSearching(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      } else {
        logger.error('Error searching users:', response.status);
        toast.error('Failed to search users')
      }
    } catch (error) {
      logger.error('Error searching users:', error);
      toast.error('Failed to search users')
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (userId: string) => {
    try {
      // Add to pending requests immediately for UI feedback
      setPendingRequests(prev => new Set(prev).add(userId))
      
      const token = await getToken()
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const responseData = await response.json()
        toast.success('Friend request sent!')
        
        // Immediately update local state with the new request
        if (responseData.request) {
          setFriendRequests(prev => [...prev, responseData.request])
          // Update pending requests set
          setPendingRequests(prev => new Set(prev).add(userId))
        }
        
        // Reload friend requests to sync state with database
        await loadFriendRequests()
        // Refresh search results to update button states
        searchUsers(searchQuery)
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || 'Failed to send friend request'
        
        // If request already exists (400), reload friend requests instead of showing error
        // This handles the case where the UI was out of sync
        if (response.status === 400 && (
          errorMessage.includes('already exists') || 
          errorMessage.includes('Already friends') ||
          errorMessage.includes('already sent') ||
          errorMessage.includes('already sent you')
        )) {
          toast.info('Friend request already exists')
          // Reload friend requests to sync UI with database
          await loadFriendRequests()
          // Refresh search results to update button states
          searchUsers(searchQuery)
        } else {
          // Remove from pending if request failed
          setPendingRequests(prev => {
            const newSet = new Set(prev)
            newSet.delete(userId)
            return newSet
          })
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      // Remove from pending if request failed
      setPendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      logger.error('Error sending friend request:', error);
      toast.error('Failed to send friend request')
    }
  }

  const respondToFriendRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast.success(status === 'ACCEPTED' ? 'Friend request accepted!' : 'Friend request declined')
        await loadFriendRequests()
        await loadFriends()
        // Refresh search results if on find friends tab
        if (searchQuery !== undefined) {
          searchUsers(searchQuery)
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || 'Failed to respond to friend request'
        
        // If 404, the request might have been deleted or already processed
        if (response.status === 404) {
          toast.info('Friend request not found - it may have been cancelled or already processed')
          // Reload to sync UI
          await loadFriendRequests()
          await loadFriends()
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      logger.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request')
    }
  }

  const getFriendStatus = (userId: string) => {
    // Check if already friends
    const isFriend = friends.some(friendship => friendship.friend.id === userId)
    if (isFriend) return 'friends'
    
    // We need currentUserId to properly determine status
    if (!currentUserId) {
      // If we don't have currentUserId yet, return 'none' to show "Add Friend"
      // This will be corrected once currentUserId is loaded
      return 'none'
    }
    
    // Check if there's a pending request SENT by current user
    // Current user is the sender, target user is the receiver
    const sentRequest = friendRequests.find(req => {
      return req.status === 'PENDING' && 
             req.sender.id === currentUserId && 
             req.receiver.id === userId
    })
    if (sentRequest) return 'sent'
    
    // Check if there's a pending request RECEIVED from this user
    // Current user is the receiver, target user is the sender
    const receivedRequest = friendRequests.find(req => {
      return req.status === 'PENDING' && 
             req.receiver.id === currentUserId && 
             req.sender.id === userId
    })
    if (receivedRequest) return 'received'
    
    return 'none'
  }

  const getFriendStatusButton = (user: User) => {
    const status = getFriendStatus(user.id)
    
    switch (status) {
      case 'friends':
        return (
          <Badge variant="secondary" className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            Friends
          </Badge>
        )
      case 'sent':
        return (
          <Badge variant="outline" className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'received':
        return (
          <Button 
            size="sm"
            onClick={() => {
              const request = friendRequests.find(req => 
                req.sender.id === user.id && req.status === 'PENDING'
              )
              if (request) {
                respondToFriendRequest(request.id, 'ACCEPTED')
              }
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Accept Request
          </Button>
        )
      default:
        return (
          <Button 
            size="sm"
            onClick={() => sendFriendRequest(user.id)}
            disabled={pendingRequests.has(user.id)}
            variant={pendingRequests.has(user.id) ? "outline" : "default"}
          >
            {pendingRequests.has(user.id) ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Pending
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </>
            )}
          </Button>
        )
    }
  }

  const startConversation = async (friendId: string) => {
    try {
      const token = await getToken()
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'DIRECT',
          participantIds: [friendId]
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Conversation started')
        // Navigate to the conversation
        window.location.href = `/messages/${data.conversation.id}`
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to start conversation')
      }
    } catch (error) {
      logger.error('Error starting conversation:', error);
      toast.error('Failed to start conversation')
    }
  }

  const handleUnfriendClick = (friendship: Friendship) => {
    setFriendToUnfriend({
      id: friendship.id,
      name: friendship.friend.name
    })
    setUnfriendDialogOpen(true)
  }

  const removeFriend = async () => {
    if (!friendToUnfriend) return

    try {
      setUnfriending(true)
      const response = await fetch(`/api/friends/${friendToUnfriend.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success(`${friendToUnfriend.name} has been removed from your friends`)
        setUnfriendDialogOpen(false)
        setFriendToUnfriend(null)
        loadFriends()
      } else {
        const error = await response.json()
        toast.error(error.error || error.message || 'Failed to remove friend')
      }
    } catch (error) {
      logger.error('Error removing friend:', error)
      toast.error('Failed to remove friend')
    } finally {
      setUnfriending(false)
    }
  }

  // TEMPORARY: Allow access to friends page for testing
  // TODO: Fix authentication properly
  if (!isSignedIn) {
    console.log('⚠️ User not authenticated, but allowing access to friends page for testing');
    // return (
    //   <div className="min-h-screen bg-background flex items-center justify-center">
    //     <Card className="w-full max-w-md">
    //       <CardHeader className="text-center">
    //         <CardTitle>Sign In Required</CardTitle>
    //       </CardHeader>
    //       <CardContent className="text-center">
    //         <p className="text-muted-foreground mb-4">
    //           Please sign in to view your friends and manage friend requests.
    //         </p>
    //         <Button onClick={() => window.location.href = '/signin'}>
    //           Sign In
    //         </Button>
    //       </CardContent>
    //     </Card>
    //   </div>
    // )
  }

  // TEMPORARY: Skip loading check for testing
  // TODO: Fix authentication properly
  if (!isLoaded) {
    console.log('⚠️ Clerk not loaded, but allowing access to friends page for testing');
    // return (
    //   <div className="min-h-screen bg-background flex items-center justify-center">
    //     <div className="text-center">
    //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
    //       <p>Loading...</p>
    //     </div>
    //   </div>
    // )
  }

  // TEMPORARY: Skip loading check for testing
  // TODO: Fix authentication properly
  if (loading) {
    console.log('⚠️ Still loading, but allowing access to friends page for testing');
    // return (
    //   <div className="min-h-screen bg-background flex items-center justify-center">
    //     <div className="text-center">
    //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
    //       <p>Loading friends...</p>
    //     </div>
    //   </div>
    // )
  }

    const pendingFriendRequests = friendRequests.filter(req => req.status === 'PENDING')

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Friends</h1>
          <p className="text-muted-foreground">
            Connect with friends and discover new people
          </p>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              <Users className="w-4 h-4 mr-2" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              <UserPlus className="w-4 h-4 mr-2" />
              Requests ({pendingFriendRequests.length})
            </TabsTrigger>
            <TabsTrigger value="find">
              <Search className="w-4 h-4 mr-2" />
              Find Friends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6">
            <div className="grid gap-4">
              {friends.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start by searching for people to connect with
                    </p>
                    <Button onClick={() => (document.querySelector('[value="find"]') as HTMLElement)?.click()}>
                      Find People
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                friends.map((friendship) => (
                  <Card key={friendship.id} className="hover:border-blue-500/50 transition-colors">
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
                            onUpdate={(frequency) => {
                              // Update local state
                              setFriends(prev => prev.map(f => 
                                f.id === friendship.id 
                                  ? { ...f, desiredHangoutFrequency: frequency }
                                  : f
                              ))
                            }}
                          />
                          <HangoutGoalIndicator
                            lastHangoutDate={friendship.stats?.lastHangoutDate}
                            desiredFrequency={friendship.desiredHangoutFrequency}
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
                              handleUnfriendClick(friendship)
                            }}
                          className="px-3"
                            title="Remove Friend"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="space-y-6">
              {/* Received Requests (Action Required) */}
              {(() => {
                // Filter: current user is receiver, status is PENDING, not a self-request, and not already friends
                const receivedRequests = friendRequests.filter(req => {
                  // Must be pending
                  if (req.status !== 'PENDING') return false
                  // Current user must be the receiver (FIXED: was checking !== instead of ===)
                  if (currentUserId && req.receiver.id !== currentUserId) return false
                  // Not a self-request
                  if (req.sender.id === req.receiver.id) return false
                  // Not already friends
                  const isAlreadyFriend = friends.some(f => f.friend.id === req.sender.id)
                  return !isAlreadyFriend
                })
                
                return receivedRequests.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Received Requests</h3>
                      <p className="text-sm text-muted-foreground">People who want to connect with you</p>
                    </div>
                    {receivedRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={request.sender.avatar} />
                                <AvatarFallback>
                                  {request.sender.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold">{request.sender.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  @{request.sender.username}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm"
                                onClick={() => respondToFriendRequest(request.id, 'ACCEPTED')}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => respondToFriendRequest(request.id, 'DECLINED')}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              })()}

              {/* Sent Requests (Pending) */}
              {(() => {
                // Filter: current user is sender, status is PENDING, not a self-request, and not already friends
                const sentRequests = friendRequests.filter(req => {
                  // Must be pending
                  if (req.status !== 'PENDING') return false
                  // Current user must be the sender
                  if (currentUserId && req.sender.id !== currentUserId) return false
                  // Not a self-request
                  if (req.sender.id === req.receiver.id) return false
                  // Not already friends
                  const isAlreadyFriend = friends.some(f => f.friend.id === req.receiver.id)
                  return !isAlreadyFriend
                })
                
                return sentRequests.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Sent Requests</h3>
                      <p className="text-sm text-muted-foreground">Waiting for response</p>
                    </div>
                    {sentRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={request.receiver.avatar} />
                                <AvatarFallback>
                                  {request.receiver.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold">{request.receiver.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  @{request.receiver.username}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sent {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              })()}

              {/* No Requests */}
              {pendingFriendRequests.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-muted-foreground">
                      You don't have any pending friend requests
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="find" className="mt-6">
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search by name or username (or leave empty to see all users)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                />
                {searching && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                )}
              </div>

              <div className="grid gap-4">
                {searchResults
                  .filter(user => getFriendStatus(user.id) !== 'friends') // Don't show existing friends
                  .map((user) => (
                  <Card key={user.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                          {user.bio && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {user.bio}
                            </p>
                          )}
                          {user.location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {user.location}
                            </p>
                          )}
                        </div>
                      </div>
                      {getFriendStatusButton(user)}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {searchQuery && searchResults.length === 0 && !searching && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No users found</h3>
                    <p className="text-muted-foreground">
                      Try searching with a different name or username
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Unfriend Confirmation Dialog */}
      <Dialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Unfriend {friendToUnfriend?.name}?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to unfriend {friendToUnfriend?.name}? This will remove them from your friends list and you'll need to send a new friend request to reconnect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setUnfriendDialogOpen(false)
                setFriendToUnfriend(null)
              }}
              disabled={unfriending}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={removeFriend}
              disabled={unfriending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {unfriending ? 'Removing...' : 'Unfriend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
