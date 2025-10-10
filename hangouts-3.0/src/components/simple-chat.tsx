'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, MessageCircle } from 'lucide-react'
interface Message {
  id: string
  content: string
  userId: string
  username: string
  timestamp: string
  avatar?: string
}
interface SimpleChatProps {
  hangoutId: string
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  } | null
  token: string | null
}
export function SimpleChat({ hangoutId, user, token }: SimpleChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/comments`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Transform API response to match Message interface
          const transformedMessages = data.comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            userId: comment.user.id,
            username: comment.user.name,
            timestamp: comment.createdAt,
            avatar: comment.user.avatar
          }))
          setMessages(transformedMessages)
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }
  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || ! isSending) return
    setIsSending(true)
    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          content: newMessage.trim()
        })
      })
      if (response.ok) {
        setNewMessage('')
        // Refresh messages after sending
        await fetchMessages()
      } else {
        console.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }
  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  // Load messages on mount and set up periodic refresh
  useEffect(() => {
    fetchMessages()
    // Refresh messages every 15 seconds
    const interval = setInterval(fetchMessages, 15000)
    return () => clearInterval(interval)
  }, [hangoutId])
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Messages */}
        <div className="h-64 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                {message.userId !== user?.id && (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium">
                    {message.avatar ? (
                      <img
                        src={message.avatar}
                        alt={message.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      message.username.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.userId === user?.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.username} • {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.userId === user?.id && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      user?.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Message Input */}
        {user ? (
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                disabled={isSending}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-700 text-center text-gray-400">
            Please sign in to chat
          </div>
        )}
      </CardContent>
    </Card>
  )
}