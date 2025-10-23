'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Loader2, Mic, MicOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { EventCardWithActions } from '@/components/event-action-modal'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actionHint?: string
  actionData?: any
  timestamp: Date
}

export function AgentChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { isSignedIn, isLoaded } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Voice recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Update input with voice transcript
  useEffect(() => {
    if (transcript && listening) {
      setInputValue(transcript)
    }
  }, [transcript, listening])

  // Auto-submit after voice input stops (with delay)
  useEffect(() => {
    if (!listening && transcript && transcript.length > 0) {
      const timer = setTimeout(() => {
        if (transcript === inputValue) {
          handleSend()
          resetTranscript()
        }
      }, 2000) // 2 second delay

      return () => clearTimeout(timer)
    }
  }, [listening, transcript])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    if (!isSignedIn) {
      toast.info('Please sign in to use the AI assistant')
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (!conversationId) {
        setConversationId(data.data.conversationId)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.data.message,
        actionHint: data.data.actionHint,
        actionData: data.data.actionData,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || 'Failed to send message')
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I'm having trouble processing your request right now. Please try again.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleVoiceRecognition = () => {
    if (listening) {
      SpeechRecognition.stopListening()
    } else {
      resetTranscript()
      SpeechRecognition.startListening({ continuous: true })
    }
  }

  const handleNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setInputValue('')
    resetTranscript()
    toast.success('Started new conversation')
  }

  const handleEventInterest = async (event: any) => {
    // Add a message indicating the event was selected
    const selectionMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `I'm interested in: ${event.title}`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, selectionMessage])

    // Send to agent to continue the flow
    setIsLoading(true)
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I want to save or create a hangout for: ${event.title}`,
          conversationId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.message,
          actionHint: data.data.actionHint,
          actionData: data.data.actionData,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error handling event interest:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Render action components based on actionHint */}
          {message.actionHint === 'show_events' && message.actionData && (
            <div className="mt-4 space-y-3">
              {message.actionData.map((event: any, index: number) => (
                <EventCardWithActions
                  key={index}
                  event={event}
                  onEventInterest={handleEventInterest}
                />
              ))}
            </div>
          )}

          {message.actionHint === 'show_saved_events' && message.actionData && (
            <div className="mt-4 space-y-2">
              {message.actionData.map((event: any) => (
                <Card key={event.id} className="cursor-pointer hover:bg-accent" onClick={() => {
                  const selectionMessage: Message = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: `I want to use: ${event.title}`,
                    timestamp: new Date(),
                  }
                  setMessages(prev => [...prev, selectionMessage])
                }}>
                  <CardContent className="p-3">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.venue}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="text-xs opacity-70 mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) return null

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>AI Assistant</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewConversation}
                >
                  New Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">Hi! I'm your event assistant</p>
                <p className="text-sm">Ask me to find events or help create hangouts with friends!</p>
                <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                  <p className="text-xs font-semibold">Try asking:</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setInputValue('Find concerts this weekend')}
                  >
                    "Find concerts this weekend"
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setInputValue('Help me create a hangout with friends')}
                  >
                    "Help me create a hangout with friends"
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setInputValue('What events are happening tonight?')}
                  >
                    "What events are happening tonight?"
                  </Button>
                </div>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={listening ? "Listening..." : "Type a message..."}
                disabled={isLoading || listening}
                className="flex-1"
              />
              
              {browserSupportsSpeechRecognition && (
                <Button
                  variant={listening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleVoiceRecognition}
                  disabled={isLoading}
                >
                  {listening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <Button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {listening && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Listening... Speak naturally and I'll process when you're done
              </p>
            )}
            
            {!browserSupportsSpeechRecognition && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Voice input not supported in this browser
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

