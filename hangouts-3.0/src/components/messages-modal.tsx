'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
// Removed api-client import - using direct fetch calls
import {
  X,
  Search,
  MessageSquare,
  Users,
  Send,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Paperclip,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MobileFullScreenModal } from '@/components/ui/mobile-modal'
import { logger } from '@/lib/logger'
interface Conversation {
  id: string
  type: 'direct' | 'group' | 'hangout'
  name: string
  avatar?: string
  participants: Array<{
    id: string
    name: string
    userIdname: string
    avatar?: string
  }>
  lastMessage?: {
    content: string
    sender: string
    timestamp: string
  }
  unreadCount: number
  isOnline?: boolean
}
interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
  timestamp: string
  type: 'text' | 'image' | 'file'
  isRead: boolean
}
interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
  selectedUser?: {
    id: string
    name: string
    userIdname: string
    avatar?: string
  } | null
}
export default function MessagesModal({ isOpen, onClose, selectedUser }: MessagesModalProps) {
  const { userId } = useAuth()
  const [activeTab, setActiveTab] = useState<'conversations' | 'new'>('conversations')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [friends, setFriends] = useState<Array<{
    id: string
    name: string
    userIdname: string
    avatar?: string
  }>>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  // Load friends when modal opens
  const loadFriends = async () => {
    // console.log('loadFriends called, userId:', userId); // Removed for production
    if (!userId) {
      // console.log('No userId available for loading friends'); // Removed for production
      return
    }
    try {
      setIsLoadingFriends(true)
      // console.log('Loading friends...'); // Removed for production
      const response = await fetch('/api/friends')
      // console.log('Friends response:', response); // Removed for production // Debug log
      if (response.ok) {
        const data = await response.json()
        if (data.friends && Array.isArray(data.friends)) {
          // console.log('Found friends:', data.friends.length); // Removed for production
          setFriends(data.friends.map(friend => ({
            id: friend.id,
            name: friend.name,
            userIdname: friend.userIdname,
            avatar: friend.avatar
          })))
        } else {
          // console.log('No friends found or invalid response format'); // Removed for production
          setFriends([])
        }
      } else {
        // console.log('No friends found or invalid response format'); // Removed for production
        setFriends([])
      }
    } catch (error) {
      logger.error('Failed to load friends:', error);
      setFriends([])
    } finally {
      setIsLoadingFriends(false)
    }
  }
  // Load conversations and calculate unread count
  const loadConversations = async () => {
    if (!userId) return
    try {
      // Set the token on the apiClient before making the request
      apiClient.setToken(userId)
      const response = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${userId}` }
      })
      if (response.ok) {
        const data = await response.json()
        setConversations(data.data.conversations || [])
        // Calculate total unread count
        const totalUnread = (data.data.conversations || []).reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0)
        setUnreadCount(totalUnread)
      }
    } catch (error) {
      logger.error('Failed to load conversations:', error);
    }
  }
  // Load data when modal opens
  useEffect(() => {
    // console.log('Modal effect triggered, isOpen:', isOpen, 'userId:', userId); // Removed for production
    if (isOpen && userId) {
      loadFriends()
      loadConversations()
      // If a userId is selected, switch to new tab and create conversation
      if (selectedUser) {
        setActiveTab('new')
        // TODO: Create or find existing conversation with selectedUser
      }
      // Mock conversations
      setConversations([
        {
          id: '1',
          type: 'direct',
          name: 'Sarah Johnson',
          participants: [
            { id: '2', name: 'Sarah Johnson', userIdname: 'sarahj', avatar: '/placeholder-avatar.png' }
          ],
          lastMessage: {
            content: 'Hey! Are you coming to the hiking trip this weekend?',
            sender: 'Sarah Johnson',
            timestamp: '2m ago'
          },
          unreadCount: 2,
          isOnline: true
        },
        {
          id: '2',
          type: 'group',
          name: 'Weekend Warriors',
          participants: [
            { id: '2', name: 'Sarah Johnson', userIdname: 'sarahj', avatar: '/placeholder-avatar.png' },
            { id: '3', name: 'Mike Chen', userIdname: 'mikec', avatar: '/placeholder-avatar.png' },
            { id: '4', name: 'Emma Davis', userIdname: 'emmad', avatar: '/placeholder-avatar.png' }
          ],
          lastMessage: {
            content: 'Mike: The weather looks perfect for Saturday!',
            sender: 'Mike Chen',
            timestamp: '1h ago'
          },
          unreadCount: 0,
          isOnline: false
        },
        {
          id: '3',
          type: 'hangout',
          name: 'Beach Volleyball Tournament',
          participants: [
            { id: '2', name: 'Sarah Johnson', userIdname: 'sarahj', avatar: '/placeholder-avatar.png' },
            { id: '3', name: 'Mike Chen', userIdname: 'mikec', avatar: '/placeholder-avatar.png' },
            { id: '4', name: 'Emma Davis', userIdname: 'emmad', avatar: '/placeholder-avatar.png' },
            { id: '5', name: 'Alex Rodriguez', userIdname: 'alexr', avatar: '/placeholder-avatar.png' }
          ],
          lastMessage: {
            content: 'Emma: Don\'t forget to bring sunscreen!',
            sender: 'Emma Davis',
            timestamp: '3h ago'
          },
          unreadCount: 1,
          isOnline: false
        }
      ])
    }
  }, [isOpen, userId])
  // Mock messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      setMessages([
        {
          id: '1',
          content: 'Hey! Are you coming to the hiking trip this weekend?',
          sender: { id: '2', name: 'Sarah Johnson', avatar: '/placeholder-avatar.png' },
          timestamp: '2m ago',
          type: 'text',
          isRead: false
        },
        {
          id: '2',
          content: 'Yes! I\'m really excited about it. What time are we meeting?',
          sender: { id: userId || '1', name: 'You', avatar: '' },
          timestamp: '1m ago',
          type: 'text',
          isRead: true
        },
        {
          id: '3',
          content: 'We\'re meeting at 8 AM at the trailhead. I\'ll send you the exact location.',
          sender: { id: '2', name: 'Sarah Johnson', avatar: '/placeholder-avatar.png' },
          timestamp: '30s ago',
          type: 'text',
          isRead: false
        }
      ])
    }
  }, [selectedConversation, userId])
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return
    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: { id: userId || '1', name: 'You', avatar: '' },
      timestamp: 'now',
      type: 'text',
      isRead: true
    }
    setMessages(prev => [...prev, message])
    setNewMessage('')
  }
  const handleViewProfile = (friend: { id: string; name: string; userIdname: string }) => {
    // Navigate to userId profile page
    window.location.href = `/profile/${friend.userIdname}`
  }
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${userId}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages || [])
      }
    } catch (error) {
      logger.error('Failed to load messages:', error);
    }
  }
  const handleStartConversation = async (friend: any) => {
    try {
      // Set the token on the apiClient before making the request
      apiClient.setToken(userId || null)
      // Create or find existing conversation with this friend
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          type: 'direct',
          participantIds: [friend.id]
        })
      })
      if (response.ok) {
        const data = await response.json()
        const conversation = data.data.conversation
        // Switch to conversations tab and select this conversation
        setActiveTab('conversations')
        setSelectedConversation(conversation)
        // Load messages for this conversation
        await loadMessages(conversation.id)
      } else {
        logger.error('Failed to create conversation:', response.statusText);
      }
    } catch (error) {
      logger.error('Error starting conversation:', error);
    }
  }
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  return (
    <MobileFullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Messages"
      className="bg-gray-900 text-white"
    >
      {/* Tab Navigation */}
      <div className="flex items-center justify-center p-4 border-b border-gray-700">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          <Button
            variant={activeTab === 'conversations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('conversations')}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Conversations
          </Button>
          <Button
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('new')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'conversations' ? (
            <>
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 rounded-md">
                        <AvatarImage
                          src={conversation.type === 'direct' ? conversation.participants[0].avatar : conversation.avatar || '/group-avatar.svg'}
                          alt={conversation.name}
                        />
                        <AvatarFallback className="rounded-md">
                          {conversation.type === 'direct'
                            ? conversation.participants[0].name.charAt(0)
                            : conversation.name.charAt(0)
                          }
                        </AvatarFallback>
                      </Avatar>
                      {conversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conversation.name}
                        </h3>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {conversation.lastMessage?.content}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {conversation.lastMessage?.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 rounded-md">
                      <AvatarImage
                        src={selectedConversation.type === 'direct' ? selectedConversation.participants[0].avatar : '/group-avatar.svg'}
                        alt={selectedConversation.name}
                      />
                      <AvatarFallback className="rounded-md">
                        {selectedConversation.type === 'direct'
                          ? selectedConversation.participants[0].name.charAt(0)
                          : selectedConversation.name.charAt(0)
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedConversation.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConversation.participants.length} participants
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender.id === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex space-x-2 max-w-xs lg:max-w-md ${message.sender.id === userId ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {message.sender.id !== userId && (
                          <Avatar className="h-8 w-8 rounded-md">
                            <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
                            <AvatarFallback className="text-xs rounded-md">
                              {message.sender.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`px-3 py-2 rounded-lg ${
                          message.sender.id === userId
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender.id === userId
                              ? 'text-blue-100'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
            </>
          ) : (
            /* New Chat Tab */
            <div className="flex-1 flex flex-col">
              {/* Search Friends */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {/* Friends List */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingFriends ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading friends...</span>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No friends found
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Add some friends to start messaging
                      </p>
                    </div>
                  </div>
                ) : (
                  friends
                    .filter(friend =>
                      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      friend.userIdname.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((friend) => (
                      <div
                        key={friend.id}
                        className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar
                            className="h-10 w-10 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleViewProfile(friend)}
                          >
                            <AvatarImage src={friend.avatar} alt={friend.name} />
                            <AvatarFallback className="rounded-md">{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              onClick={() => handleViewProfile(friend)}
                            >
                              {friend.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{friend.userIdname}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartConversation(friend)}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
    </MobileFullScreenModal>
  )
}