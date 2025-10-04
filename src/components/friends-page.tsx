"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  UserPlus, 
  Users, 
  MessageSquare, 
  MoreHorizontal, 
  Check, 
  X, 
  Loader2, 
  UserSearch, 
  UserMinus, 
  Plus, 
  Settings,
  Phone,
  Video,
  Star,
  Clock,
  Globe
} from "lucide-react"
import { useFriends } from "@/hooks/use-friends"
import { useAuth } from "@/contexts/auth-context"
import { apiClient, User } from "@/lib/api-client"
import Link from "next/link"

interface Group {
  id: string
  name: string
  type: 'GROUP'
  participants: Array<{
    id: string
    name: string
    username: string
    avatar?: string
  }>
  lastMessage?: {
    content: string
    sender: string
    timestamp: string
  }
  unreadCount: number
  isOnline: boolean
  createdAt: string
  updatedAt: string
}

export function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("friends")
  const [isResponding, setIsResponding] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set())
  
  // Group-related state
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { 
    friends, 
    sentRequests, 
    receivedRequests, 
    isLoading, 
    error, 
    sendFriendRequest, 
    respondToFriendRequest,
    refetch
  } = useFriends()

  // Load group conversations
  const loadGroups = async () => {
    if (!user?.token) return
    
    setIsLoadingGroups(true)
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Filter only group conversations
        const groupConversations = data.data.conversations.filter((conv: any) => conv.type === 'GROUP')
        setGroups(groupConversations)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    } finally {
      setIsLoadingGroups(false)
    }
  }

  // Search users
  const searchUsers = async (query: string) => {
    setIsSearching(true)
    try {
      const response = await apiClient.searchUsers(query, 20, 0)
      setSearchResults(response.users)
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    searchUsers(query)
  }

  // Send friend request
  const handleSendFriendRequest = async (userId: string) => {
    setSendingRequests(prev => new Set(prev).add(userId))
    try {
      await sendFriendRequest(userId)
    } catch (error) {
      console.error('Error sending friend request:', error)
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // Respond to friend request
  const handleRespondToRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setIsResponding(requestId)
    try {
      await respondToFriendRequest(requestId, status)
    } catch (error) {
      console.error('Error responding to friend request:', error)
    } finally {
      setIsResponding(null)
    }
  }

  // Create direct message
  const createDirectMessage = async (friendId: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          type: 'DIRECT',
          participantIds: [friendId]
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.conversation) {
          window.location.href = `/messages/${data.data.conversation.id}`
        }
      }
    } catch (error) {
      console.error('Error creating direct message:', error)
    }
  }

  // Unfriend user
  const unfriendUser = async (friendId: string) => {
    if (!confirm('Are you sure you want to unfriend this user?')) {
      return
    }

    try {
      const response = await fetch('/api/friends/unfriend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          friendId: friendId
        })
      })

      if (response.ok) {
        // Refresh friends list
        window.location.reload()
      } else {
        console.error('Failed to unfriend user')
        alert('Failed to unfriend user. Please try again.')
      }
    } catch (error) {
      console.error('Error unfriending user:', error)
      alert('Error unfriending user. Please try again.')
    }
  }


  // Load groups on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadGroups()
    }
  }, [isAuthenticated])

  // Load all users when component mounts and when "Find People" tab is activated
  useEffect(() => {
    if (isAuthenticated && user?.token) {
      searchUsers('') // Load all users
    }
  }, [isAuthenticated, user?.token])

  // Load users when "Find People" tab is activated
  useEffect(() => {
    if (activeTab === 'find' && isAuthenticated && user?.token) {
      searchUsers('') // Load all users
    }
  }, [activeTab, isAuthenticated, user?.token])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view friends</h1>
          <Link href="/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading friends...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Friends</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search friends or find new people..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border-b border-gray-700/50">
          <TabsTrigger value="friends" className="text-sm">Friends</TabsTrigger>
          <TabsTrigger value="requests" className="text-sm">Requests</TabsTrigger>
          <TabsTrigger value="groups" className="text-sm">Groups</TabsTrigger>
          <TabsTrigger value="find" className="text-sm">Find People</TabsTrigger>
        </TabsList>

        {/* Friends Tab */}
        <TabsContent value="friends" className="p-4 space-y-4">
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-white mb-2">No friends yet</h3>
              <p className="text-gray-400 mb-4">Start by finding people to connect with</p>
              <Button onClick={() => setActiveTab("find")}>
                Find People
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <Card key={friend.id} className="bg-gray-800/50 border-gray-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 rounded-lg">
                          <AvatarImage src={friend.avatar || "/placeholder-avatar.png"} />
                          <AvatarFallback className="bg-gray-700 text-white rounded-lg">
                            {friend.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-white">{friend.name}</h3>
                          <p className="text-sm text-gray-400">@{friend.username}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {friend.isActive ? "Online" : "Offline"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Friends since {new Date(friend.friendshipCreatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => createDirectMessage(friend.id)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => unfriendUser(friend.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="p-4 space-y-4">
          {(!receivedRequests || receivedRequests.length === 0) && (!sentRequests || sentRequests.length === 0) ? (
            <div className="text-center py-12">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-white mb-2">No friend requests</h3>
              <p className="text-gray-400">You don't have any pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Received Requests */}
              {receivedRequests && receivedRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Received Requests</h3>
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <Card key={request.id} className="bg-gray-800/50 border-gray-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-12 h-12 rounded-lg">
                                <AvatarImage src={request.sender.avatar || "/placeholder-avatar.png"} />
                                <AvatarFallback className="bg-gray-700 text-white rounded-lg">
                                  {request.sender.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-white">{request.sender.name}</h3>
                                <p className="text-sm text-gray-400">@{request.sender.username}</p>
                                {request.message && (
                                  <p className="text-sm text-gray-300 mt-1">"{request.message}"</p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleRespondToRequest(request.id, 'ACCEPTED')}
                                disabled={isResponding === request.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isResponding === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRespondToRequest(request.id, 'DECLINED')}
                                disabled={isResponding === request.id}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {sentRequests && sentRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Sent Requests</h3>
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <Card key={request.id} className="bg-gray-800/50 border-gray-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-12 h-12 rounded-lg">
                                <AvatarImage src={request.receiver.avatar || "/placeholder-avatar.png"} />
                                <AvatarFallback className="bg-gray-700 text-white rounded-lg">
                                  {request.receiver.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-white">{request.receiver.name}</h3>
                                <p className="text-sm text-gray-400">@{request.receiver.username}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    Pending
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(request.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="p-4 space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-white mb-2">No group chats yet</h3>
              <p className="text-gray-400 mb-4">Start a direct message and add more people to create a group chat</p>
              <Button onClick={() => setActiveTab("friends")}>
                View Friends
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card key={group.id} className="bg-gray-800/50 border-gray-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 rounded-lg">
                          <AvatarImage src={group.avatar || "/group-avatar.svg"} />
                          <AvatarFallback className="bg-gray-700 text-white rounded-lg">
                            {group.name?.charAt(0) || "G"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-white">{group.name}</h3>
                          {group.lastMessage && (
                            <p className="text-sm text-gray-400 truncate">
                              {group.lastMessage.sender}: {group.lastMessage.content}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {group.participants.length} members
                            </Badge>
                            {group.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {group.unreadCount} unread
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(group.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/messages/${group.id}`}>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Find People Tab */}
        <TabsContent value="find" className="p-4 space-y-4">
          {searchQuery ? (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">
                Search Results {isSearching && <Loader2 className="w-4 h-4 inline animate-spin ml-2" />}
              </h3>
              {searchResults.length === 0 && !isSearching ? (
                <div className="text-center py-8">
                  <UserSearch className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">No users found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <Card key={user.id} className="bg-gray-800/50 border-gray-700/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12 rounded-lg">
                              <AvatarImage src={user.avatar || "/placeholder-avatar.png"} />
                              <AvatarFallback className="bg-gray-700 text-white rounded-lg">
                                {user.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-white">{user.name}</h3>
                              <p className="text-sm text-gray-400">@{user.username}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {user.isActive ? "Online" : "Offline"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleSendFriendRequest(user.id)}
                              disabled={sendingRequests.has(user.id)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {sendingRequests.has(user.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-white mb-2">Find New People</h3>
              <p className="text-gray-400 mb-4">Search for people to connect with</p>
              <p className="text-sm text-gray-500">Start typing in the search box above</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
