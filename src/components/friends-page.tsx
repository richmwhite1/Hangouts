"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, UserPlus, Users, MessageSquare, MoreHorizontal } from "lucide-react"

interface Friend {
  id: string
  name: string
  avatar: string
  status: "online" | "away" | "offline"
  mutualFriends: number
  lastSeen?: string
}

interface Group {
  id: string
  name: string
  avatar: string
  memberCount: number
  lastActivity: string
  isAdmin: boolean
}

const mockFriends: Friend[] = [
  { id: "1", name: "Sarah Chen", avatar: "/professional-woman-avatar.png", status: "online", mutualFriends: 12 },
  { id: "2", name: "Mike Rodriguez", avatar: "/friendly-man-avatar.jpg", status: "online", mutualFriends: 8 },
  {
    id: "3",
    name: "Alex Johnson",
    avatar: "/man-avatar.png",
    status: "away",
    mutualFriends: 15,
    lastSeen: "2 hours ago",
  },
  { id: "4", name: "Maya Patel", avatar: "/diverse-woman-avatar.png", status: "online", mutualFriends: 6 },
  {
    id: "5",
    name: "Jordan Kim",
    avatar: "/diverse-person-avatars.png",
    status: "offline",
    mutualFriends: 4,
    lastSeen: "Yesterday",
  },
  { id: "6", name: "Sam Wilson", avatar: "/outdoorsy-man-avatar.jpg", status: "online", mutualFriends: 9 },
  {
    id: "7",
    name: "Emma Davis",
    avatar: "/athletic-woman-avatar.jpg",
    status: "away",
    mutualFriends: 11,
    lastSeen: "1 hour ago",
  },
  { id: "8", name: "Chris Lee", avatar: "/man-avatar.png", status: "online", mutualFriends: 7 },
]

const mockGroups: Group[] = [
  {
    id: "1",
    name: "Weekend Warriors",
    avatar: "/diverse-hiking-group.png",
    memberCount: 8,
    lastActivity: "2 hours ago",
    isAdmin: true,
  },
  {
    id: "2",
    name: "Coffee Enthusiasts",
    avatar: "/coffee-group.jpg",
    memberCount: 12,
    lastActivity: "1 day ago",
    isAdmin: false,
  },
  {
    id: "3",
    name: "Gaming Squad",
    avatar: "/diverse-gaming-group.png",
    memberCount: 6,
    lastActivity: "3 hours ago",
    isAdmin: true,
  },
  {
    id: "4",
    name: "Photography Club",
    avatar: "/camera-group.jpg",
    memberCount: 15,
    lastActivity: "5 hours ago",
    isAdmin: false,
  },
]

const suggestedFriends: Friend[] = [
  { id: "s1", name: "Jessica Park", avatar: "/professional-woman-avatar.png", status: "online", mutualFriends: 5 },
  { id: "s2", name: "David Chen", avatar: "/friendly-man-avatar.jpg", status: "away", mutualFriends: 3 },
  { id: "s3", name: "Lisa Rodriguez", avatar: "/diverse-woman-avatar.png", status: "online", mutualFriends: 7 },
  { id: "s4", name: "Ryan Kim", avatar: "/man-avatar.png", status: "offline", mutualFriends: 2 },
]

const allUsers: Friend[] = [
  { id: "u1", name: "Taylor Swift", avatar: "/professional-woman-avatar.png", status: "online", mutualFriends: 0 },
  { id: "u2", name: "John Doe", avatar: "/friendly-man-avatar.jpg", status: "away", mutualFriends: 1 },
  { id: "u3", name: "Jane Smith", avatar: "/diverse-woman-avatar.png", status: "online", mutualFriends: 0 },
  { id: "u4", name: "Michael Brown", avatar: "/man-avatar.png", status: "offline", mutualFriends: 2 },
]

export function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("find")

  const filteredFriends = mockFriends.filter((friend) => friend.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredGroups = mockGroups.filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredUsers = allUsers.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const onlineFriends = mockFriends.filter((f) => f.status === "online").length

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Friends & Groups</h1>
          <p className="text-muted-foreground">{onlineFriends} friends online</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={activeTab === "find" ? "Search all users..." : "Search friends and groups..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="find" className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Find Friends</span>
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Friends ({mockFriends.length})</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Groups ({mockGroups.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="space-y-4">
          {!searchQuery && (
            <div>
              <h3 className="font-medium mb-3 text-sm text-muted-foreground">SUGGESTED FOR YOU</h3>
              <p className="text-xs text-muted-foreground mb-4">
                People who have attended events near you or with your friends
              </p>
              <div className="grid gap-3">
                {suggestedFriends.map((friend) => (
                  <Card key={friend.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                              <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
                                friend.status === "online"
                                  ? "bg-green-500"
                                  : friend.status === "away"
                                    ? "bg-yellow-500"
                                    : "bg-gray-400"
                              }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{friend.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>{friend.mutualFriends} mutual friends</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" className="bg-primary hover:bg-primary/90">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {searchQuery && (
            <div>
              <h3 className="font-medium mb-3 text-sm text-muted-foreground">SEARCH RESULTS</h3>
              <div className="grid gap-3">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
                                user.status === "online"
                                  ? "bg-green-500"
                                  : user.status === "away"
                                    ? "bg-yellow-500"
                                    : "bg-gray-400"
                              }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{user.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              {user.mutualFriends > 0 ? (
                                <span>{user.mutualFriends} mutual friends</span>
                              ) : (
                                <span>No mutual friends</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" className="bg-primary hover:bg-primary/90">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          <div className="grid gap-3">
            {filteredFriends.map((friend) => (
              <Card key={friend.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                          <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
                            friend.status === "online"
                              ? "bg-green-500"
                              : friend.status === "away"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{friend.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className="capitalize">{friend.status}</span>
                          {friend.lastSeen && <span>• {friend.lastSeen}</span>}
                          <span>• {friend.mutualFriends} mutual friends</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid gap-3">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={group.avatar || "/placeholder.svg"} alt={group.name} />
                        <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{group.name}</h3>
                          {group.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{group.memberCount} members</span>
                          <span>• Active {group.lastActivity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4" />
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
