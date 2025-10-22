"use client"

import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, Users } from 'lucide-react'
import { useRealtimeMessages } from '@/hooks/use-realtime-hangouts'
import { useSocket } from '@/contexts/socket-context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface RealtimeChatProps {
  hangoutId: string
  className?: string
}

export const RealtimeChat = memo(function RealtimeChat({ 
  hangoutId, 
  className 
}: RealtimeChatProps) {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const { messages, sendMessage, isConnected } = useRealtimeMessages(hangoutId)
  const { socket } = useSocket()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-start', { hangoutId })
    }
  }, [socket, isConnected, hangoutId])

  const handleTypingStop = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { hangoutId })
    }
  }, [socket, isConnected, hangoutId])

  // Handle input change with typing indicators
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    
    if (!isTyping) {
      setIsTyping(true)
      handleTypingStart()
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      handleTypingStop()
    }, 1000)
  }, [isTyping, handleTypingStart, handleTypingStop])

  // Handle message send
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !isConnected) return

    sendMessage(message.trim())
    setMessage('')
    
    // Stop typing
    if (isTyping) {
      setIsTyping(false)
      handleTypingStop()
    }
  }, [message, isConnected, sendMessage, isTyping, handleTypingStop])

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }, [handleSendMessage])

  // Listen for typing indicators
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleUserTyping = (data: { 
      hangoutId: string; 
      user: { id: string; username: string }; 
      isTyping: boolean 
    }) => {
      if (data.hangoutId === hangoutId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          if (data.isTyping) {
            newSet.add(data.user.username)
          } else {
            newSet.delete(data.user.username)
          }
          return newSet
        })
      }
    }

    socket.on('user-typing', handleUserTyping)

    return () => {
      socket.off('user-typing', handleUserTyping)
    }
  }, [socket, isConnected, hangoutId])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.user.avatar} alt={msg.user.name} />
                <AvatarFallback className="text-xs">
                  {msg.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{msg.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </ScrollArea>

      {/* Connection status */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">
          <Badge variant="outline" className="mr-2">
            Disconnected
          </Badge>
          Reconnecting...
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || !isConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
})



































