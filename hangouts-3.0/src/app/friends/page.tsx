'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Search,
  MessageCircle,
  Calendar,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

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
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  message?: string
  createdAt: string
}

interface Friendship {
  id: string
  user: User
  friend: User
  status: 'ACTIVE' | 'BLOCKED'
  createdAt: string
}

export default function FriendsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [friends, setFriends] = useState<Friendship[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFriends()
      loadFriendRequests()
      // Load all users for discovery
      searchUsers('')
    }
  }, [isAuthenticated, user])

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends')
      if (response.ok) {
        const data = await response.json()
        setFriends(data.friends || [])
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const loadFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests')
      if (response.ok) {
        const data = await response.json()
        setFriendRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error loading friend requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    setSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      toast.error('Failed to search users')
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (userId: string) => {
    try {
      // Add to pending requests immediately for UI feedback
      setPendingRequests(prev => new Set(prev).add(userId))
      
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        toast.success('Friend request sent!')
        searchUsers(searchQuery) // Refresh search results
      } else {
        // Remove from pending if request failed
        setPendingRequests(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
        const error = await response.json()
        toast.error(error.message || 'Failed to send friend request')
      }
    } catch (error) {
      // Remove from pending if request failed
      setPendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      console.error('Error sending friend request:', error)
      toast.error('Failed to send friend request')
    }
  }

  const respondToFriendRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const response = await fetch(`/api/friends/request/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast.success(status === 'ACCEPTED' ? 'Friend request accepted!' : 'Friend request declined')
        loadFriendRequests()
        loadFriends()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to respond to friend request')
      }
    } catch (error) {
      console.error('Error responding to friend request:', error)
      toast.error('Failed to respond to friend request')
    }
  }

  const removeFriend = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Friend removed')
        loadFriends()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      toast.error('Failed to remove friend')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Please sign in to view your friends and manage friend requests.
            </p>
            <Button onClick={() => window.location.href = '/signin'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading friends...</p>
        </div>
      </div>
    )
  }

    const pendingFriendRequests = friendRequests.filter(req => req.status === 'PENDING')
  const sentRequests = friendRequests.filter(req => req.sender.id === user?.id)

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">
              <Users className="w-4 h-4 mr-2" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              <UserPlus className="w-4 h-4 mr-2" />
              Requests ({pendingFriendRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              <UserCheck className="w-4 h-4 mr-2" />
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Find People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6">
            <div className="grid gap-4">
              {friends.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by searching for people to connect with
                    </p>
                    <Button onClick={() => document.querySelector('[value="search"]')?.click()}>
                      Find People
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                friends.map((friendship) => (
                  <Card key={friendship.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={friendship.friend.avatar} />
                          <AvatarFallback>
                            {friendship.friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{friendship.friend.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            @{friendship.friend.username}
                          </p>
                          {friendship.friend.bio && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {friendship.friend.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          Invite
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeFriend(friendship.id)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="grid gap-4">
              {pendingFriendRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-muted-foreground">
                      Friend requests will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingFriendRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.sender.avatar} />
                          <AvatarFallback>
                            {request.sender.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.sender.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            @{request.sender.username}
                          </p>
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              "{request.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => respondToFriendRequest(request.id, 'ACCEPTED')}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => respondToFriendRequest(request.id, 'DECLINED')}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            <div className="grid gap-4">
              {sentRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                    <p className="text-muted-foreground">
                      Sent friend requests will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sentRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.receiver.avatar} />
                          <AvatarFallback>
                            {request.receiver.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.receiver.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            @{request.receiver.username}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {request.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="mt-6">
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
                {searchResults.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
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
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => sendFriendRequest(user.id)}
                        disabled={pendingRequests.has(user.id)}
                        variant={pendingRequests.has(user.id) ? "secondary" : "default"}
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              {searchQuery && searchResults.length === 0 && !searching && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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
    </div>
  )
}
