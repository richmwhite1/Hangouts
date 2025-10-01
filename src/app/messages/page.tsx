"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Users, 
  Send, 
  Phone, 
  Video, 
  MoreVertical,
  Settings,
  Archive,
  Star,
  Grid3X3,
  List
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import Link from "next/link"

interface Friend {
  id: string
  name: string
  username: string
  avatar: string | null
  isActive: boolean
  friendshipCreatedAt: string
}

interface Conversation {
  id: string
  type: string
  name: string
  avatar: string | null
  participants: Array<{
    id: string
    name: string
    username: string
    avatar: string | null
  }>
  lastMessage: {
    content: string
    sender: string
    timestamp: string
  } | null
  unreadCount: number
  isOnline: boolean
  createdAt: string
  updatedAt: string
}

export default function MessagesPage() {
  const { isAuthenticated, user, token } = useAuth()
  const { getUnreadCount, markConversationAsRead } = useUnreadCounts()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedConversations, setSelectedConversations] = useState<string[]>([])

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations()
      fetchFriends()
    }
  }, [isAuthenticated])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFriends(data.data.friends || [])
      }
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startConversation = async (friendId: string) => {
    try {
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
        // Refresh conversations
        await fetchConversations()
        setShowNewChat(false)
        // Navigate to the conversation
        window.location.href = `/messages/${data.data.conversation.id}`
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
    const unreadCount = getUnreadCount(conversation.id)
    
    if (activeTab === "all") return matchesSearch
    if (activeTab === "unread") return matchesSearch && unreadCount > 0
    if (activeTab === "groups") return matchesSearch && conversation.type === "GROUP"
    if (activeTab === "direct") return matchesSearch && conversation.type === "DIRECT"
    
    return matchesSearch
  })

  const startGroupConversation = async (friendIds: string[]) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'GROUP',
          name: 'New Group Chat',
          participantIds: friendIds
        })
      })

      if (response.ok) {
        const data = await response.json()
        await fetchConversations()
        setShowNewChat(false)
        window.location.href = `/messages/${data.data.conversation.id}`
      }
    } catch (error) {
      console.error('Error starting group conversation:', error)
    }
  }

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations(prev => 
      prev.includes(conversationId) 
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    )
  }

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view messages</h1>
          <Link href="/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold">Messages</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              >
                {viewMode === "list" ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowNewChat(!showNewChat)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar - Full Width */}
          <div className="w-full bg-gray-900/30 h-screen overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
                  <TabsTrigger value="groups" className="text-xs">Groups</TabsTrigger>
                  <TabsTrigger value="direct" className="text-xs">Direct</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-white mb-2">No conversations</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {activeTab === "unread" ? "No unread messages" : "Start a new conversation"}
                  </p>
                  <Button
                    onClick={() => setShowNewChat(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                </div>
              ) : (
                <div className={`p-2 ${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2" : "space-y-1"}`}>
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
                    const isSelected = selectedConversations.includes(conversation.id)
                    const unreadCount = getUnreadCount(conversation.id)
                    
                    return (
                      <Link 
                        key={conversation.id} 
                        href={`/messages/${conversation.id}`}
                        onClick={() => markConversationAsRead(conversation.id)}
                      >
                        <div className={`group relative ${viewMode === "grid" ? "p-4" : "p-3"} rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-purple-600/20 border border-purple-500/30' 
                            : 'hover:bg-gray-800/50'
                        }`}>
                          <div className={`flex ${viewMode === "grid" ? "flex-col text-center space-y-3" : "items-center space-x-3"}`}>
                            <div className="relative">
                              <Avatar className={`${viewMode === "grid" ? "w-16 h-16 mx-auto" : "w-12 h-12"} rounded-lg`}>
                                <AvatarImage 
                                  src={conversation.type === "GROUP" 
                                    ? conversation.avatar || "/group-avatar.svg"
                                    : otherParticipant?.avatar || "/placeholder-avatar.png"
                                  } 
                                  alt={conversation.name} 
                                />
                                <AvatarFallback className="rounded-lg">
                                  {conversation.type === "GROUP" 
                                    ? conversation.name?.charAt(0) || "G"
                                    : otherParticipant?.name?.charAt(0) || "U"
                                  }
                                </AvatarFallback>
                              </Avatar>
                              {conversation.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                              )}
                            </div>
                            <div className={`${viewMode === "grid" ? "w-full" : "flex-1 min-w-0"}`}>
                              <div className={`flex ${viewMode === "grid" ? "flex-col space-y-2" : "items-center justify-between mb-1"}`}>
                                <h3 className={`font-medium text-white ${viewMode === "grid" ? "text-center" : "truncate"}`}>{conversation.name}</h3>
                                <div className={`flex items-center ${viewMode === "grid" ? "justify-center space-x-2" : "space-x-2"}`}>
                                  {conversation.lastMessage && (
                                    <span className="text-xs text-gray-400">
                                      {formatLastMessageTime(conversation.lastMessage.timestamp)}
                                    </span>
                                  )}
                                  {unreadCount > 0 && (
                                    <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                      {unreadCount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className={`${viewMode === "grid" ? "text-center" : "flex items-center justify-between"}`}>
                                <p className={`text-sm text-gray-400 ${viewMode === "grid" ? "text-center" : "truncate"}`}>
                                  {conversation.lastMessage ? (
                                    <>
                                      <span className="font-medium">
                                        {conversation.lastMessage.sender}:
                                      </span>{" "}
                                      {conversation.lastMessage.content}
                                    </>
                                  ) : (
                                    "No messages yet"
                                  )}
                                </p>
                                {conversation.type === "GROUP" && viewMode === "list" && (
                                  <Users className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl bg-gray-900 border-gray-700 max-h-[80vh] overflow-hidden">
              <CardHeader className="border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">Start a New Chat</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChat(false)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="direct" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 mb-6">
                    <TabsTrigger value="direct">Direct Message</TabsTrigger>
                    <TabsTrigger value="group">Group Chat</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="direct" className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
                      />
                    </div>
                    
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-400">Loading friends...</div>
                    ) : filteredFriends.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        {searchQuery ? 'No friends found matching your search' : 'No friends found'}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredFriends.map((friend) => (
                          <div
                            key={friend.id}
                            className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10 rounded-lg">
                                <AvatarImage src={friend.avatar || "/placeholder-avatar.png"} alt={friend.name} />
                                <AvatarFallback className="rounded-lg">{friend.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-white">{friend.name}</p>
                                <p className="text-sm text-gray-400">@{friend.username}</p>
                              </div>
                              {friend.isActive && (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              )}
                            </div>
                            <Button
                              onClick={() => startConversation(friend.id)}
                              size="sm"
                              className="bg-purple-600/80 hover:bg-purple-700/80"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Chat
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="group" className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search friends to add to group..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
                      />
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10 rounded-lg">
                              <AvatarImage src={friend.avatar || "/placeholder-avatar.png"} alt={friend.name} />
                              <AvatarFallback className="rounded-lg">{friend.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{friend.name}</p>
                              <p className="text-sm text-gray-400">@{friend.username}</p>
                            </div>
                            {friend.isActive && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                          <Button
                            onClick={() => startGroupConversation([friend.id])}
                            size="sm"
                            className="bg-purple-600/80 hover:bg-purple-700/80"
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
