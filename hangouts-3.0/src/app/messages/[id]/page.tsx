"use client"

import { useState, useEffect, useRef, use, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Send, 
  Smile, 
  Paperclip, 
  Image, 
  File, 
  MapPin,
  Users,
  Trash2,
  Edit3,
  Reply,
  ThumbsUp,
  Heart,
  Laugh,
  Angry,
  Frown,
  Zap,
  Search,
  Download,
  MessageSquare,
  UserPlus,
  X,
  Loader2,
  Camera,
  Save
} from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { useWebSocket } from "@/contexts/websocket-context"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import { User } from "@/types/api"
import Link from "next/link"

import { logger } from '@/lib/logger'
interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  createdAt: string
  updatedAt: string
  type: string
  isEdited: boolean
  isDeleted: boolean
  replyTo?: {
    id: string
    content: string
    sender: {
      id: string
      name: string
      username: string
      avatar: string | null
    }
  }
  reactions: Array<{
    emoji: string
    user: {
      id: string
      name: string
      username: string
      avatar: string | null
    }
    createdAt: string
  }>
  attachments: Array<{
    id: string
    type: string
    url: string
    filename: string
    mimeType: string
    fileSize: number
    thumbnailUrl: string
  }>
}

interface Conversation {
  id: string
  type: string
  name: string
  avatar?: string | null
  participants: Array<{
    id: string
    name: string
    username: string
    avatar: string | null
    role: string
    isOnline: boolean
  }>
  createdAt: string
  updatedAt: string
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { isSignedIn, userId } = useAuth()
  const { socket, isConnected, typingUsers, onlineUsers, sendTypingIndicator, sendMessage, sendReaction, joinConversation, leaveConversation } = useWebSocket()
  const { markConversationAsRead: markAsReadInHook, fetchUnreadCounts } = useUnreadCounts()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showAddParticipants, setShowAddParticipants] = useState(false)
  const [availableFriends, setAvailableFriends] = useState<User[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [isAddingParticipants, setIsAddingParticipants] = useState(false)
  const [isEditingGroupName, setIsEditingGroupName] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [databaseUserId, setDatabaseUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasMarkedAsReadRef = useRef<string | null>(null)

  useEffect(() => {
    if (isSignedIn && resolvedParams.id) {
      fetchConversation()
      fetchMessages()
      
      // Join conversation for real-time updates
      if (isConnected) {
        joinConversation(resolvedParams.id)
      }
      
      // Fetch database user ID
      fetchDatabaseUserId()
    }
    
    return () => {
      if (isConnected && resolvedParams.id) {
        leaveConversation(resolvedParams.id)
      }
    }
  }, [isSignedIn, resolvedParams.id, isConnected])

  const markConversationAsRead = useCallback(async () => {
    if (!resolvedParams.id) return
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/mark-read`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        logger.error('Failed to mark conversation as read:', errorData)
        return
      }
      
      // Update the unread count in the hook immediately
      await markAsReadInHook(resolvedParams.id)
      // Also refresh counts to ensure accuracy
      await fetchUnreadCounts()
    } catch (error) {
      logger.error('Error marking conversation as read:', error);
    }
  }, [resolvedParams.id, markAsReadInHook, fetchUnreadCounts])

  // Mark conversation as read when it's loaded, messages are loaded, and user is viewing it
  useEffect(() => {
    // Only mark as read when all conditions are met: conversation loaded, messages loaded, user authenticated, not loading
    // Also check if we've already marked this conversation as read to avoid duplicate calls
    if (conversation && messages.length > 0 && databaseUserId && !isLoading && resolvedParams.id) {
      // Only mark if we haven't already marked this conversation
      if (hasMarkedAsReadRef.current !== resolvedParams.id) {
        // Use a small delay to ensure everything is rendered
        const timer = setTimeout(() => {
          markConversationAsRead()
          hasMarkedAsReadRef.current = resolvedParams.id
        }, 100)
        
        return () => clearTimeout(timer)
      }
    }
    
    // Reset the ref when conversation changes
    if (resolvedParams.id !== hasMarkedAsReadRef.current) {
      hasMarkedAsReadRef.current = null
    }
  }, [conversation, messages.length, databaseUserId, isLoading, resolvedParams.id, markConversationAsRead])

  const fetchDatabaseUserId = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Database user ID fetched:', data.data?.id)
        setDatabaseUserId(data.data?.id)
      }
    } catch (error) {
      console.error('❌ Error fetching database user ID:', error)
    }
  }

  // Real-time event listeners
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: any) => {
      if (data.conversationId === resolvedParams.id) {
        setMessages(prev => [...prev, data])
        scrollToBottom()
      }
    }

    const handleMessageEdit = (data: any) => {
      if (data.conversationId === resolvedParams.id) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, content: data.content, isEdited: true, editedAt: data.editedAt }
            : msg
        ))
      }
    }

    const handleMessageDelete = (data: any) => {
      if (data.conversationId === resolvedParams.id) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, isDeleted: true, deletedAt: data.deletedAt, content: 'This message was deleted' }
            : msg
        ))
      }
    }

    const handleMessageReaction = (data: any) => {
      if (data.conversationId === resolvedParams.id) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { 
                ...msg, 
                reactions: [
                  ...msg.reactions.filter(r => !(r.user.id === data.userId && r.emoji === data.emoji)),
                  { emoji: data.emoji, user: data.user, createdAt: new Date().toISOString() }
                ]
              }
            : msg
        ))
      }
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:edit', handleMessageEdit)
    socket.on('message:delete', handleMessageDelete)
    socket.on('message:reaction', handleMessageReaction)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:edit', handleMessageEdit)
      socket.off('message:delete', handleMessageDelete)
      socket.off('message:reaction', handleMessageReaction)
    }
  }, [socket, resolvedParams.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}`)
      
      if (response.ok) {
        const data = await response.json()
        // console.log('Fetched conversation data:', data); // Removed for production
        setConversation(data.data.conversation)
      }
    } catch (error) {
      logger.error('Error fetching conversation:', error);
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/messages`)
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages || [])
      }
    } catch (error) {
      logger.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return

    const messageContent = newMessage.trim()
    setNewMessage("")

    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent,
          type: 'TEXT',
          replyToId: replyingTo?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, data.data.message])
        
        // Send via WebSocket for real-time delivery
        if (isConnected) {
          sendMessage(resolvedParams.id, {
            content: messageContent,
            type: 'TEXT',
            replyToId: replyingTo?.id
          })
        }
        
        setReplyingTo(null)
        scrollToBottom()
      }
    } catch (error) {
      logger.error('Error sending message:', error);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true)
      sendTypingIndicator(resolvedParams.id, true)
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(resolvedParams.id, false)
    }, 1000)
  }

  const handleSendTypingIndicator = async (typing: boolean) => {
    try {
      await fetch(`/api/conversations/${resolvedParams.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: typing })
      })
    } catch (error) {
      logger.error('Error sending typing indicator:', error);
    }
  }

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })

      if (response.ok) {
        // Send via WebSocket for real-time delivery
        if (isConnected) {
          sendReaction(resolvedParams.id, messageId, emoji)
        }
        
        // Refresh messages to get updated reactions
        await fetchMessages()
      }
    } catch (error) {
      logger.error('Error adding reaction:', error);
    }
  }

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      })

      if (response.ok) {
        setEditingMessage(null)
        await fetchMessages()
      }
    } catch (error) {
      logger.error('Error editing message:', error);
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/messages/${messageId}`, {
        method: 'DELETE' })

      if (response.ok) {
        await fetchMessages()
      }
    } catch (error) {
      logger.error('Error deleting message:', error);
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const getEmojiIcon = (emoji: string) => {
    const emojiMap: { [key: string]: any } = {
      '👍': ThumbsUp,
      '❤️': Heart,
      '😂': Laugh,
      '😢': Frown,
      '😡': Angry,
      '😮': Zap
    }
    return emojiMap[emoji] || Smile
  }

  const searchMessages = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}&conversationId=${resolvedParams.id}`)

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data.results)
      }
    } catch (error) {
      logger.error('Error searching messages:', error);
    } finally {
      setIsSearching(false)
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/conversations/${resolvedParams.id}/messages/${messageId}/read`, {
        method: 'POST' })
    } catch (error) {
      logger.error('Error marking message as read:', error);
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/conversations/${resolvedParams.id}/messages/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastReadMessageId: messages[messages.length - 1]?.id
        })
      })
    } catch (error) {
      logger.error('Error marking all as read:', error);
    }
  }

  const exportConversation = async (format: string) => {
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/export?format=${format}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conversation-${conversation?.name || conversation?.id}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setShowExportMenu(false)
      }
    } catch (error) {
      logger.error('Error exporting conversation:', error);
    }
  }

  // Load available friends for adding to conversation
  const loadAvailableFriends = async () => {
    setIsLoadingFriends(true)
    try {
      const response = await fetch('/api/friends')
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Friends API response:', data)
        
        // The API returns { success: true, friends: [...] } where friends is an array of friendship objects
        // Each friendship has { id, friend: { user data }, status, createdAt }
        const friendships = data.friends || []
        console.log('🔍 Raw friendships:', friendships)
        
        // Extract the actual friend user data from friendship objects
        const friends = friendships.map((friendship: any) => friendship.friend)
        console.log('🔍 Extracted friends:', friends)
        
        // Filter out friends who are already participants
        const currentParticipantIds = conversation?.participants.map(p => p.id) || []
        console.log('🔍 Current participant IDs:', currentParticipantIds)
        
        const available = friends.filter((friend: User) => 
          !currentParticipantIds.includes(friend.id)
        )
        console.log('🔍 Available friends after filtering:', available)
        
        setAvailableFriends(available)
      } else {
        console.error('❌ Failed to fetch friends:', response.status, response.statusText)
      }
    } catch (error) {
      logger.error('Error loading friends:', error);
      console.error('❌ Error loading friends:', error)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  // Add participants to conversation
  const addParticipants = async () => {
    if (selectedFriends.length === 0) return

    setIsAddingParticipants(true)
    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedFriends
        })
      })

      if (response.ok) {
        // Refresh conversation data
        await fetchConversation()
        setShowAddParticipants(false)
        setSelectedFriends([])
      } else {
        const errorData = await response.json()
        logger.error('Error adding participants:', errorData);
      }
    } catch (error) {
      logger.error('Error adding participants:', error);
    } finally {
      setIsAddingParticipants(false)
    }
  }

  // Edit group name
  const startEditingGroupName = () => {
    setEditingGroupName(conversation?.name || "")
    setIsEditingGroupName(true)
  }

  const saveGroupName = async () => {
    if (!editingGroupName.trim() || editingGroupName === conversation?.name) {
      setIsEditingGroupName(false)
      return
    }

    try {
      const response = await fetch(`/api/conversations/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingGroupName.trim()
        })
      })

      if (response.ok) {
        await fetchConversation()
        setIsEditingGroupName(false)
      }
    } catch (error) {
      logger.error('Error updating group name:', error);
    }
  }

  // Upload group photo
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be smaller than 2MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const response = await fetch(`/api/conversations/${resolvedParams.id}/avatar`, {
        method: 'POST',
        
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        // console.log('Avatar upload successful:', result); // Removed for production
        await fetchConversation()
      } else {
        const error = await response.json()
        logger.error('Avatar upload failed:', error);
        alert('Failed to upload photo')
      }
    } catch (error) {
      logger.error('Error uploading photo:', error);
      alert('Error uploading photo')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  if (!isSignedIn) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Conversation not found</h1>
          <Link href="/messages">
            <Button>Back to Messages</Button>
          </Link>
        </div>
      </div>
    )
  }

  const otherParticipant = conversation.participants.find(p => p.id !== databaseUserId)
  const onlineParticipants = conversation.participants.filter(p => onlineUsers.includes(p.id) && p.id !== databaseUserId)

  // Debug logging for user icon issue
  console.log('🔍 User icon debugging:')
  console.log('  - Clerk userId:', userId)
  console.log('  - Database userId:', databaseUserId)
  console.log('  - Conversation participants:', conversation.participants)
  console.log('  - Other participant:', otherParticipant)
  console.log('  - Should show avatar:', otherParticipant?.avatar || "/placeholder-avatar.png")

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/messages">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <Avatar className="w-12 h-12 rounded-lg">
                  <AvatarImage 
                    src={conversation.type === "GROUP" 
                      ? conversation.avatar || "/group-avatar.svg"
                      : otherParticipant?.avatar || "/placeholder-avatar.png"
                    } 
                    alt={conversation.name} 
                  />
                  <AvatarFallback className="rounded-lg">
                    {conversation.type === "GROUP" 
                      ? "G" 
                      : otherParticipant?.name?.charAt(0) || "U"
                    }
                  </AvatarFallback>
                </Avatar>
                {conversation.type === "GROUP" && (
                  <Button
                    size="sm"
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-700 hover:bg-gray-600 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </Button>
                )}
                {onlineParticipants.length > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                {conversation.type === "GROUP" && isEditingGroupName ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveGroupName()
                        if (e.key === 'Escape') setIsEditingGroupName(false)
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={saveGroupName}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingGroupName(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h2 className="font-medium text-white">{conversation.name}</h2>
                    {conversation.type === "GROUP" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={startEditingGroupName}
                        className="p-1 h-auto"
                      >
                        <Edit3 className="w-3 h-3 text-gray-400" />
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  {conversation.type === "GROUP" ? (
                    <p className="text-sm text-gray-400">
                      {conversation.participants.length} members
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      @{otherParticipant?.username}
                    </p>
                  )}
                  {onlineParticipants.length > 0 && (
                    <Badge variant="secondary" className="bg-green-600/20 text-green-300 text-xs">
                      {onlineParticipants.length} online
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
             <div className="flex items-center space-x-2">
               <Button 
                 variant="ghost" 
                 size="sm"
                 onClick={() => setShowSearch(!showSearch)}
               >
                 <Search className="w-4 h-4" />
               </Button>
               <Button 
                 variant="ghost" 
                 size="sm"
                 onClick={() => setShowParticipants(!showParticipants)}
               >
                 <Users className="w-4 h-4" />
               </Button>
             </div>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="bg-gray-900/30 border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">Participants</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipants(false)}
            >
              ×
            </Button>
          </div>
          <div className="space-y-2">
            {/* Add People Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadAvailableFriends()
                setShowAddParticipants(true)
              }}
              className="w-full justify-start bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add People
            </Button>
            
            {conversation.participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800/50">
                <Avatar className="w-8 h-8 rounded-lg">
                  <AvatarImage src={participant.avatar || "/placeholder-avatar.png"} alt={participant.name} />
                  <AvatarFallback className="rounded-lg">{participant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{participant.name}</p>
                  <p className="text-xs text-gray-400">@{participant.username}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {participant.isOnline && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {participant.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className="bg-gray-900/30 border-b border-gray-700/50 p-4">
          <div className="flex items-center space-x-3">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchMessages(e.target.value)
              }}
              className="flex-1 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSearch(false)
                setSearchQuery("")
                setSearchResults([])
              }}
            >
              ×
            </Button>
          </div>
          
          {isSearching && (
            <div className="mt-2 text-center text-gray-400 text-sm">
              Searching...
            </div>
          )}
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => {
                    // Scroll to message
                    const messageElement = document.getElementById(`message-${result.id}`)
                    if (messageElement) {
                      messageElement.scrollIntoView({ behavior: 'smooth' })
                    }
                    setShowSearch(false)
                  }}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Avatar className="w-6 h-6 rounded-lg">
                      <AvatarImage src={result.sender.avatar || "/placeholder-avatar.png"} alt={result.sender.name} />
                      <AvatarFallback className="rounded-lg text-xs">{result.sender.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-white">{result.sender.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(result.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p 
                    className="text-sm text-gray-300"
                    dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export Menu */}
      {showExportMenu && (
        <div className="bg-gray-900/30 border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">Export Conversation</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportMenu(false)}
            >
              ×
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => exportConversation('json')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export as JSON
            </Button>
            <Button
              onClick={() => exportConversation('txt')}
              className="bg-gray-600 hover:bg-gray-700"
            >
              <File className="w-4 h-4 mr-2" />
              Export as Text
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
            <p className="text-gray-400">Start the conversation by sending a message!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender.id === databaseUserId
            const isGroupChat = conversation.type === "GROUP"
            
            return (
                 <div
                   key={message.id}
                   id={`message-${message.id}`}
                   className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                 >
                <div className={`flex space-x-2 max-w-2xl ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar for group chats or non-own messages */}
                  {(isGroupChat || !isOwn) && (
                    <Avatar className="w-8 h-8 rounded-lg flex-shrink-0">
                      <AvatarImage src={message.sender.avatar || "/placeholder-avatar.png"} alt={message.sender.name} />
                      <AvatarFallback className="rounded-lg text-xs">{message.sender.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex flex-col space-y-1">
                    {/* Sender name for group chats */}
                    {isGroupChat && !isOwn && (
                      <p className="text-xs text-gray-400 px-1">{message.sender.name}</p>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`relative rounded-2xl px-4 py-2 max-w-md ${
                      isOwn 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-800 text-white'
                    }`}>
                      {/* Reply to message */}
                      {message.replyTo && (
                        <div className={`text-xs p-2 rounded-lg mb-2 border-l-2 ${
                          isOwn ? 'bg-purple-500/20 border-purple-400' : 'bg-gray-700/50 border-gray-500'
                        }`}>
                          <p className="font-medium">{message.replyTo.sender.name}</p>
                          <p className="truncate">{message.replyTo.content}</p>
                        </div>
                      )}
                      
                      {/* Message content */}
                      {message.isDeleted ? (
                        <p className="italic text-gray-400">This message was deleted</p>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      {/* Attachments */}
                      {message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="rounded-lg overflow-hidden">
                              {attachment.type === 'IMAGE' ? (
                                <img 
                                  src={attachment.url} 
                                  alt={attachment.filename}
                                  className="max-w-xs rounded-lg"
                                />
                              ) : (
                                <div className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded-lg">
                                  <File className="w-4 h-4" />
                                  <span className="text-xs truncate">{attachment.filename}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Message metadata */}
                      <div className={`flex items-center justify-between mt-1 ${
                        isOwn ? 'text-purple-200' : 'text-gray-400'
                      }`}>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {message.isEdited && (
                            <span className="text-xs">(edited)</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Reactions */}
                      {message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(
                            (message.reactions || []).reduce((acc, reaction) => {
                              if (!reaction?.emoji) return acc
                              if (!acc[reaction.emoji]) acc[reaction.emoji] = []
                              acc[reaction.emoji].push(reaction)
                              return acc
                            }, {} as { [key: string]: any[] })
                          ).map(([emoji, reactions]) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message.id, emoji)}
                              className="flex items-center space-x-1 px-2 py-1 bg-gray-700/50 rounded-full hover:bg-gray-600/50 transition-colors"
                            >
                              <span className="text-xs">{emoji}</span>
                              <span className="text-xs">{reactions.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Message actions */}
                    <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addReaction(message.id, '👍')}
                        className="h-6 w-6 p-0"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(message)}
                        className="h-6 w-6 p-0"
                      >
                        <Reply className="w-3 h-3" />
                      </Button>
                      {isOwn && !message.isDeleted && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMessage(message)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessage(message.id)}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        
        {/* Typing indicator */}
        {typingUsers[resolvedParams.id] && typingUsers[resolvedParams.id]?.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{typingUsers[resolvedParams.id]?.length} {typingUsers[resolvedParams.id]?.length === 1 ? 'person is' : 'people are'} typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply to message */}
      {replyingTo && (
        <div className="bg-gray-800/50 border-t border-gray-700/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Replying to {replyingTo.sender.name}</p>
                <p className="text-sm text-white truncate max-w-md">{replyingTo.content}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-gray-900/50 border-t border-gray-700/50 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={editingMessage ? editingMessage.content : newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500 pr-20"
            />
            
            {/* Attachment menu */}
            {showAttachmentMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="sm" className="justify-start">
                    <Image className="w-4 h-4 mr-2" />
                    Photo
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start">
                    <File className="w-4 h-4 mr-2" />
                    File
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    Location
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button
              onClick={editingMessage ? () => editMessage(editingMessage.id, newMessage) : handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
            <div className="grid grid-cols-6 gap-1">
              {['👍', '❤️', '😂', '😢', '😡', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage(prev => prev + emoji)
                    setShowEmojiPicker(false)
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Participants Modal */}
        {showAddParticipants && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    {conversation?.type === 'DIRECT' ? 'Add People to Chat' : 'Add People to Group'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddParticipants(false)
                      setSelectedFriends([])
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {isLoadingFriends ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading friends...</span>
                  </div>
                ) : availableFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">No friends available to add</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {availableFriends.map((friend) => (
                        <label key={friend.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFriends.includes(friend.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFriends(prev => [...prev, friend.id])
                              } else {
                                setSelectedFriends(prev => prev.filter(id => id !== friend.id))
                              }
                            }}
                            className="rounded"
                          />
                          <Avatar className="w-8 h-8 rounded-lg">
                            <AvatarImage src={friend.avatar || "/placeholder-avatar.png"} />
                            <AvatarFallback className="rounded-lg">
                              {friend.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{friend.name}</p>
                            <p className="text-xs text-gray-400">@{friend.username}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowAddParticipants(false)
                          setSelectedFriends([])
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addParticipants}
                        disabled={selectedFriends.length === 0 || isAddingParticipants}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isAddingParticipants ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Add {selectedFriends.length > 0 ? `${selectedFriends.length} ` : ''}People
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
