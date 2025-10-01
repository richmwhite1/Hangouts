"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Search, MessageSquare, Users, Clock } from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"

interface Conversation {
  id: string
  type: "hangout" | "direct"
  title: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  participants: Array<{
    id: string
    name: string
    avatar: string
  }>
  hangoutId?: string
}

const mockConversations: Conversation[] = [
  {
    id: "conv1",
    type: "hangout",
    title: "Weekend Coffee Meetup",
    lastMessage: "Looking forward to seeing everyone tomorrow!",
    lastMessageTime: "2 min ago",
    unreadCount: 3,
    participants: [
      { id: "1", name: "Sarah Chen", avatar: "/professional-woman-avatar.png" },
      { id: "2", name: "Alex Johnson", avatar: "/man-avatar.png" },
      { id: "3", name: "Maya Patel", avatar: "/diverse-woman-avatar.png" },
    ],
    hangoutId: "1",
  },
  {
    id: "conv2",
    type: "hangout",
    title: "Friday Night Gaming Session",
    lastMessage: "Should I bring extra controllers?",
    lastMessageTime: "15 min ago",
    unreadCount: 0,
    participants: [
      { id: "4", name: "Mike Rodriguez", avatar: "/friendly-man-avatar.jpg" },
      { id: "5", name: "Lisa Wang", avatar: "/diverse-woman-avatar.png" },
      { id: "6", name: "Tom Brown", avatar: "/man-avatar.png" },
    ],
    hangoutId: "2",
  },
  {
    id: "conv3",
    type: "direct",
    title: "Emma Davis",
    lastMessage: "Thanks for the photography tips!",
    lastMessageTime: "1 hour ago",
    unreadCount: 1,
    participants: [{ id: "7", name: "Emma Davis", avatar: "/athletic-woman-avatar.jpg" }],
  },
  {
    id: "conv4",
    type: "hangout",
    title: "Hiking Adventure at Sunset Peak",
    lastMessage: "Weather looks perfect for tomorrow",
    lastMessageTime: "3 hours ago",
    unreadCount: 0,
    participants: [
      { id: "8", name: "David Kim", avatar: "/outdoorsy-man-avatar.jpg" },
      { id: "9", name: "Anna Lee", avatar: "/athletic-woman-avatar.jpg" },
      { id: "10", name: "Ben Wilson", avatar: "/man-avatar.png" },
    ],
    hangoutId: "3",
  },
]

export function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredConversations = mockConversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalUnread = mockConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Messages</h1>
          <p className="text-muted-foreground">Stay connected with your hangout groups and friends</p>
        </div>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="px-3 py-1">
            {totalUnread} unread
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Conversations</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredConversations.map((conversation) => (
                <div key={conversation.id}>
                  <Button
                    variant={selectedConversation?.id === conversation.id ? "secondary" : "ghost"}
                    className="w-full justify-start p-4 h-auto"
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className="relative">
                        {conversation.type === "hangout" ? (
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-foreground" />
                          </div>
                        ) : (
                          <Avatar className="w-10 h-10">
                            <AvatarImage
                              src={conversation.participants[0]?.avatar || "/placeholder-avatar.png"}
                              alt={conversation.participants[0]?.name}
                            />
                            <AvatarFallback>{conversation.participants[0]?.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-0 h-5 text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate">{conversation.title}</h4>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{conversation.lastMessageTime}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                        {conversation.type === "hangout" && (
                          <div className="flex -space-x-1 mt-1">
                            {conversation.participants.slice(0, 3).map((participant, index) => (
                              <Avatar key={index} className="w-4 h-4 border border-background">
                                <AvatarImage src={participant.avatar || "/placeholder-avatar.png"} alt={participant.name} />
                                <AvatarFallback className="text-xs">{participant.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                            {conversation.participants.length > 3 && (
                              <div className="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center">
                                <span className="text-xs">+{conversation.participants.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                  <Separator />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <ChatInterface conversation={selectedConversation} />
          ) : (
            <Card className="h-full">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium">Select a conversation</h3>
                    <p className="text-muted-foreground">Choose a conversation from the list to start chatting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
