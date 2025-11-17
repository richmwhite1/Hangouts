"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { AvatarWithStatus } from "@/components/ui/avatar-with-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, X, Search, Users, Check } from "lucide-react"
import { useAuth } from '@clerk/nextjs'

import { logger } from '@/lib/logger'
interface Friend {
  id: string
  name: string
  username: string
  avatar: string | null
  isActive: boolean
}

interface Conversation {
  id: string
  name: string
  participants: Array<{
    id: string
    name: string
    username: string
    avatar: string | null
  }>
  lastMessage?: {
    content: string
    sender: string
    timestamp: string
  }
  unreadCount: number
}

interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
    avatar: string | null
  }
  createdAt: string
}

interface SimpleMessagingProps {
  isOpen: boolean
  onClose: () => void
  selectedFriend?: Friend | null
}

export function SimpleMessaging({ isOpen, onClose, selectedFriend }: SimpleMessagingProps) {
  const { user, getToken } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversations' | 'friends'>('conversations')
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([])
  const [isGroupMode, setIsGroupMode] = useState(false)
  const [groupName, setGroupName] = useState("")

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends()
      fetchConversations()
    }
  }, [isOpen, user])

  useEffect(() => {
    if (selectedFriend) {
      setActiveTab('conversations')
      startConversation(selectedFriend.id)
    }
  }, [selectedFriend])

  const fetchFriends = async () => {
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
      logger.error('Error fetching friends:', error);
    }
  }

  const fetchConversations = async () => {
    try {
      const token = await getToken()
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
      logger.error('Error fetching conversations:', error);
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages || [])
      }
    } catch (error) {
      logger.error('Error fetching messages:', error);
    }
  }

  const startConversation = async (friendId: string) => {
    try {
      setIsLoading(true)
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
        const conversation = data.data.conversation
        
        // Find the conversation in our list or add it
        const existingConv = conversations.find(c => c.id === conversation.id)
        if (existingConv) {
          setSelectedConversation(existingConv)
        } else {
          // Add new conversation to list
          const newConv: Conversation = {
            id: conversation.id,
            name: conversation.name,
            participants: conversation.participants,
            lastMessage: null,
            unreadCount: 0
          }
          setConversations(prev => [newConv, ...prev])
          setSelectedConversation(newConv)
        }
        
        // Load messages for this conversation
        await fetchMessages(conversation.id)
      }
    } catch (error) {
      logger.error('Error starting conversation:', error);
    } finally {
      setIsLoading(false)
    }
  }

  const startGroupConversation = async () => {
    if (selectedFriends.length < 2) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GROUP',
          name: groupName || `Group with ${selectedFriends.length} friends`,
          participantIds: selectedFriends.map(f => f.id)
        })
      })

      if (response.ok) {
        const data = await response.json()
        const conversation = data.data.conversation
        
        // Add new conversation to list
        const newConv: Conversation = {
          id: conversation.id,
          name: conversation.name,
          participants: conversation.participants,
          lastMessage: null,
          unreadCount: 0
        }
        setConversations(prev => [newConv, ...prev])
        setSelectedConversation(newConv)
        
        // Reset group mode
        setSelectedFriends([])
        setIsGroupMode(false)
        setGroupName("")
        
        // Load messages for this conversation
        await fetchMessages(conversation.id)
      }
    } catch (error) {
      logger.error('Error starting group conversation:', error);
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFriendSelection = (friend: Friend) => {
    if (selectedFriends.find(f => f.id === friend.id)) {
      setSelectedFriends(prev => prev.filter(f => f.id !== friend.id))
    } else {
      setSelectedFriends(prev => [...prev, friend])
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'TEXT'
        })
      })

      if (response.ok) {
        setNewMessage("")
        // Refresh messages
        await fetchMessages(selectedConversation.id)
        // Refresh conversations to update last message
        await fetchConversations()
      }
    } catch (error) {
      logger.error('Error sending message:', error);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Messages</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-1/3 border-r border-gray-700 flex flex-col">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700">
              <Button
                variant={activeTab === 'conversations' ? 'default' : 'ghost'}
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('conversations')}
              >
                Conversations
              </Button>
              <Button
                variant={activeTab === 'friends' ? 'default' : 'ghost'}
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('friends')}
              >
                New Chat
              </Button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={activeTab === 'conversations' ? "Search conversations..." : "Search friends..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'conversations' ? (
                <div className="space-y-1">
                  {conversations.map((conversation) => {
                    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
                    return (
                      <div
                        key={conversation.id}
                        className={`p-3 cursor-pointer hover:bg-gray-800 transition-colors ${
                          selectedConversation?.id === conversation.id ? 'bg-gray-800' : ''
                        }`}
                        onClick={() => {
                          setSelectedConversation(conversation)
                          fetchMessages(conversation.id)
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10 rounded-md">
                            <AvatarImage src={otherParticipant?.avatar || "/placeholder-avatar.png"} alt={otherParticipant?.name || "User"} />
                            <AvatarFallback className="rounded-md">{otherParticipant?.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">{conversation.name}</h3>
                            {conversation.lastMessage && (
                              <p className="text-sm text-gray-400 truncate">
                                {conversation.lastMessage.sender}: {conversation.lastMessage.content}
                              </p>
                            )}
                          </div>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Group Mode Controls */}
                  {isGroupMode && (
                    <div className="p-3 border-b border-gray-700">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-white">Create Group Chat</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsGroupMode(false)
                              setSelectedFriends([])
                              setGroupName("")
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Group name (optional)"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
                          </span>
                          <Button
                            onClick={startGroupConversation}
                            disabled={selectedFriends.length < 2 || isLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
                          >
                            {isLoading ? 'Creating...' : 'Create Group'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Friends List */}
                  {filteredFriends.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        {friends.length === 0 ? 'No friends found' : 'No friends match your search'}
                      </h3>
                      <p className="text-gray-400">
                        {friends.length === 0 
                          ? 'Add some friends to start messaging' 
                          : 'Try a different search term'
                        }
                      </p>
                    </div>
                  ) : (
                    filteredFriends.map((friend) => {
                    const isSelected = selectedFriends.find(f => f.id === friend.id)
                    return (
                      <div
                        key={friend.id}
                        className={`p-3 cursor-pointer hover:bg-gray-800 transition-colors ${
                          isSelected ? 'bg-blue-900/30 border border-blue-500/50' : ''
                        }`}
                        onClick={() => {
                          if (isGroupMode) {
                            toggleFriendSelection(friend)
                          } else {
                            startConversation(friend.id)
                          }
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          {isGroupMode && (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          )}
                          <AvatarWithStatus
                            src={friend.avatar || "/placeholder-avatar.png"}
                            alt={friend.name || "User"}
                            fallback={friend.name || "U"}
                            size="lg"
                            status="offline"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">{friend.name}</h3>
                            <p className="text-sm text-gray-400">@{friend.username}</p>
                          </div>
                          {friend.isActive && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    )
                  }))
                  }

                  {/* Group Mode Toggle */}
                  {!isGroupMode && (
                    <div className="p-3 border-t border-gray-700">
                      <Button
                        onClick={() => setIsGroupMode(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Create Group Chat
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10 rounded-md">
                      <AvatarImage 
                        src={selectedConversation.type === 'GROUP' 
                          ? "/group-avatar.svg" 
                          : selectedConversation.participants.find(p => p.id !== user?.id)?.avatar || "/placeholder-avatar.png"
                        } 
                        alt={selectedConversation.name} 
                      />
                      <AvatarFallback className="rounded-md">
                        {selectedConversation.type === 'GROUP' 
                          ? "G" 
                          : selectedConversation.name?.charAt(0) || "U"
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-white">{selectedConversation.name || "Unknown"}</h3>
                      <p className="text-sm text-gray-400">
                        {selectedConversation.type === 'GROUP' 
                          ? `${selectedConversation.participants.length} participants`
                          : `@${selectedConversation.participants.find(p => p.id !== user?.id)?.username}`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender.id === user?.id
                      const isGroupChat = selectedConversation.type === 'GROUP'
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                          <div className={`flex space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {!isOwn && (
                              <Avatar className="w-8 h-8 rounded-md flex-shrink-0">
                                <AvatarImage src={message.sender.avatar || "/placeholder-avatar.png"} alt={message.sender.name} />
                                <AvatarFallback className="rounded-md text-xs">{message.sender.name?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex flex-col">
                              {/* Show sender name for group chats or non-own messages */}
                              {(isGroupChat || !isOwn) && (
                                <p className={`text-xs mb-1 px-1 ${isOwn ? 'text-right text-blue-300' : 'text-gray-400'}`}>
                                  {isOwn ? 'You' : message.sender.name}
                                </p>
                              )}
                              <div className={`rounded-lg px-3 py-2 ${
                                isOwn 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-800 text-white'
                              }`}>
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-200' : 'text-gray-400'
                                }`}>
                                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {activeTab === 'conversations' ? 'Select a conversation' : 'Start a new chat'}
                  </h3>
                  <p className="text-gray-400">
                    {activeTab === 'conversations' 
                      ? 'Choose a conversation from the list to start messaging'
                      : 'Select a friend to start a new conversation'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
