'use client'
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  Clock,
  Calendar,
  MessageCircle,
  UserX
} from "lucide-react"
import { useFriends } from "@/hooks/use-friends"
import { useAuth } from "@clerk/nextjs"
import { User } from "@/types/api"
import { UniversalFriend } from "@/lib/universal-friendship-queries"
import Link from "next/link"
import { logger } from '@/lib/logger'
import { SharedHangout } from '@/lib/services/friend-relationship-service'
import { RelationshipStatus } from '@/lib/friend-relationship-utils'
import { HangoutFrequency } from '@/lib/services/relationship-reminder-service'
import { FriendSection, groupFriendsByGoalStatus } from '@/components/friends/friend-section'
import { GoalSettingModal } from '@/components/friends/goal-setting-modal'
import { FriendFrequencySelector } from '@/components/friend-frequency-selector'
import { HangoutGoalIndicator } from '@/components/hangout-goal-indicator'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

interface Group {
  id: string
  name: string
  type: 'GROUP'
  avatar?: string
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

interface EnhancedFriend {
  id: string
  name: string
  username: string
  avatar?: string
  isActive: boolean
  friendshipCreatedAt: Date
  desiredHangoutFrequency: HangoutFrequency | null
  hangoutStats: {
    lastHangoutDate: Date | null
    totalHangouts: number
    lastHangout?: SharedHangout
  }
  upcomingHangouts: SharedHangout[]
  goalStatus: {
    status: RelationshipStatus
    days: number | null
    text: string
    daysUntilThreshold?: number
    thresholdDays?: number
  }
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("friends")
  const [isResponding, setIsResponding] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set())
  const [friendStatuses, setFriendStatuses] = useState<Map<string, 'none' | 'pending' | 'friends' | 'received'>>(new Map())
  // Group-related state
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const { isSignedIn, isLoaded, userId, getToken } = useAuth()
  const {
    friends: rawFriends,
    sentRequests,
    receivedRequests,
    isLoading,
    error,
    sendFriendRequest,
    respondToFriendRequest,
    refetch
  } = useFriends()


  // Cast to correct type - the API returns UniversalFriend[] but hook is typed as User[]
  const friends = rawFriends as unknown as UniversalFriend[]
  // Enhanced friend data
  const [enhancedFriends, setEnhancedFriends] = useState<EnhancedFriend[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  // Goal setting modal
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalModalFriend, setGoalModalFriend] = useState<EnhancedFriend | null>(null)
  // Additional state variables
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())
  const [friendToUnfriend, setFriendToUnfriend] = useState<{id: string, name: string} | null>(null)
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false)
  const [unfriending, setUnfriending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load groups on mount
  useEffect(() => {
    if (isSignedIn) {
      loadGroups()
    }
  }, [isSignedIn])

  useEffect(() => {
    updateFriendStatuses()
  }, [friends, sentRequests, receivedRequests])

  // Fetch enhanced friend data with hangout stats and upcoming plans
  const fetchEnhancedFriendData = useCallback(async () => {
    if (!userId || friends.length === 0) return

    setIsLoadingStats(true)
    try {
      const token = await getToken()
      const enhancedFriendsData: EnhancedFriend[] = []

      // Process friends in parallel for better performance
      const friendPromises = friends.map(async (friend) => {
        try {
          // Call API route instead of direct Prisma call
          const response = await fetch(`/api/friends/enhanced?friendId=${friend.friend.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (!response.ok) {
            throw new Error('Failed to fetch enhanced data')
          }

          const data = await response.json()
          const { hangoutStats, upcomingHangouts, goalStatus, desiredHangoutFrequency } = data.data

          const enhanced: EnhancedFriend = {
            id: friend.friend.id,
            name: friend.friend.name,
            username: friend.friend.username,
            isActive: true,
            friendshipCreatedAt: friend.createdAt,
            desiredHangoutFrequency: desiredHangoutFrequency || null,
            hangoutStats,
            upcomingHangouts,
            goalStatus
          }
          if (friend.friend.avatar) {
            enhanced.avatar = friend.friend.avatar
          }
          return enhanced
        } catch (error) {
          logger.error(`Error fetching data for friend ${friend.friend.id}:`, error)
          // Return basic friend data if stats fail
          const basic: EnhancedFriend = {
            id: friend.friend.id,
            name: friend.friend.name,
            username: friend.friend.username,
            isActive: true,
            friendshipCreatedAt: friend.createdAt,
            desiredHangoutFrequency: null,
            hangoutStats: {
              lastHangoutDate: null,
              totalHangouts: 0
            },
            upcomingHangouts: [],
            goalStatus: {
              status: 'no-goal' as RelationshipStatus,
              days: null,
              text: 'Never'
            }
          }
          if (friend.friend.avatar) {
            basic.avatar = friend.friend.avatar
          }
          return basic
        }
      })

      const results = await Promise.all(friendPromises)

      // Update state, merging with existing to preserve any local updates (like recently saved goals)
      setEnhancedFriends(prev => {
        const existingMap = new Map(prev.map(f => [f.id, f]))
        const uniqueResults = new Map<string, EnhancedFriend>()
        
        results.forEach(friend => {
          if (friend) {
            const existing = existingMap.get(friend.id)
            // Prefer API data (it's the source of truth), but preserve local frequency temporarily if API hasn't updated yet
            if (existing && existing.desiredHangoutFrequency && !friend.desiredHangoutFrequency) {
              // Keep local frequency if API doesn't have it yet (race condition protection)
              uniqueResults.set(friend.id, {
                ...friend,
                desiredHangoutFrequency: existing.desiredHangoutFrequency
              })
            } else {
              // Use API data (which should have the updated frequency after save)
              uniqueResults.set(friend.id, friend)
            }
          }
        })
        
        return Array.from(uniqueResults.values())
      })
    } catch (error) {
      logger.error('Error fetching enhanced friend data:', error)
      // Fallback: create basic enhanced friends from raw friends data
      const basicEnhanced: EnhancedFriend[] = friends.map(friend => {
        const enhanced: EnhancedFriend = {
          id: friend.friend.id,
          name: friend.friend.name,
          username: friend.friend.username,
          isActive: true,
          friendshipCreatedAt: friend.createdAt,
          desiredHangoutFrequency: null,
          hangoutStats: {
            lastHangoutDate: null,
            totalHangouts: 0
          },
          upcomingHangouts: [],
          goalStatus: {
            status: 'no-goal' as RelationshipStatus,
            days: null,
            text: 'Never'
          }
        }
        if (friend.friend.avatar) {
          enhanced.avatar = friend.friend.avatar
        }
        return enhanced
      })
      setEnhancedFriends(basicEnhanced)
    } finally {
      setIsLoadingStats(false)
    }
  }, [userId, friends, getToken])

  // Fetch enhanced friend data when friends change
  useEffect(() => {
    if (isSignedIn && userId && friends.length > 0) {
      // Deduplicate friends by friend ID first
      const uniqueFriendsMap = new Map<string, UniversalFriend>()
      friends.forEach(friend => {
        if (friend && friend.friend) {
          const existing = uniqueFriendsMap.get(friend.friend.id)
          if (!existing || friend.createdAt < existing.createdAt) {
            uniqueFriendsMap.set(friend.friend.id, friend)
          }
        }
      })
      const uniqueFriends = Array.from(uniqueFriendsMap.values())
      
      // Initialize with basic friend data immediately
      const basicEnhanced: EnhancedFriend[] = uniqueFriends.map(friend => {
        const enhanced: EnhancedFriend = {
          id: friend.friend.id,
          name: friend.friend.name,
          username: friend.friend.username,
          isActive: true,
          friendshipCreatedAt: friend.createdAt,
          desiredHangoutFrequency: null,
          hangoutStats: {
            lastHangoutDate: null,
            totalHangouts: 0
          },
          upcomingHangouts: [],
          goalStatus: {
            status: 'no-goal' as RelationshipStatus,
            days: null,
            text: 'Never'
          }
        }
        if (friend.friend.avatar) {
          enhanced.avatar = friend.friend.avatar
        }
        return enhanced
      })
      setEnhancedFriends(basicEnhanced)
      
      // Then fetch enhanced data in background (this will update with goal frequencies)
      fetchEnhancedFriendData()
    } else if (friends.length === 0) {
      setEnhancedFriends([])
    }
  }, [friends, isSignedIn, userId, fetchEnhancedFriendData])

  // Set current user ID when user is loaded
  useEffect(() => {
    if (isSignedIn && userId) {
      setCurrentUserId(userId)
      setLoading(false)
    } else if (!isSignedIn && isLoaded) {
      setLoading(false)
    }
  }, [isSignedIn, userId, isLoaded])

  // Load all users when component mounts and when "Find People" tab is activated
  useEffect(() => {
    if (isSignedIn && userId) {
      searchUsers('') // Load all users
    }
  }, [isSignedIn, userId])
  // Load users when "Find People" tab is activated
  useEffect(() => {
    if (activeTab === 'find' && isSignedIn && userId) {
      searchUsers('') // Load all users
    }
  }, [activeTab, isSignedIn, userId])

  // Load group conversations
  const loadGroups = async () => {
    if (!userId) return
    setIsLoadingGroups(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Handle different response structures
        const conversations = data.data?.conversations || data.conversations || []
        // Filter only group conversations
        const groupConversations = conversations.filter((conv: any) => conv && conv.type === 'GROUP')
        setGroups(groupConversations || [])
      }
    } catch (error) {
      logger.error('Error loading groups:', error);
      setGroups([])
    } finally {
      setIsLoadingGroups(false)
    }
  }

  // Load friend requests (stub - using useFriends hook instead)
  const loadFriendRequests = async () => {
    // This is handled by the useFriends hook
    await refetch()
  }

  // Load friends (stub - using useFriends hook instead)
  const loadFriends = async () => {
    // This is handled by the useFriends hook
    await refetch()
  }
  // Search users
  const searchUsers = async (query: string) => {
    setIsSearching(true)
    try {
      const response = await apiClient.searchUsers(query || '', 20, 0)
      setSearchResults(response?.users || [])
    } catch (error) {
      logger.error('Error searching users:', error);
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

  const updateFriendStatuses = () => {
    const statusMap = new Map<string, 'none' | 'pending' | 'friends' | 'received'>()

    // Mark friends
    friends.forEach(friend => {
      statusMap.set(friend.friend.id, 'friends')
    })

    // Mark sent requests
    sentRequests.forEach(request => {
      statusMap.set(request.receiver.id, 'pending')
    })

    // Mark received requests
    receivedRequests.forEach(request => {
      statusMap.set(request.sender.id, 'received')
    })

    setFriendStatuses(statusMap)
  }

  const getFriendStatus = (userId: string) => {
    // Check if already friends
    const isFriend = friends.some(friendship => friendship.friend.id === userId)
    if (isFriend) return 'friends'
    
    // We need currentUserId to properly determine status
    if (!currentUserId) {
      // If we don't have currentUserId yet, return 'none' to show "Add Friend"
      // This will be corrected once currentUserId is loaded
      return 'none'
    }
    
    // Check if there's a pending request SENT by current user
    // Current user is the sender, target user is the receiver
    if (sentRequests && Array.isArray(sentRequests)) {
      const sentRequest = sentRequests.find(req => {
        return req.status === 'PENDING' && 
               req.receiver.id === userId
      })
      if (sentRequest) return 'sent'
    }
    
    // Check if there's a pending request RECEIVED from this user
    // Current user is the receiver, target user is the sender
    if (receivedRequests && Array.isArray(receivedRequests)) {
      const receivedRequest = receivedRequests.find(req => {
        return req.status === 'PENDING' && 
               req.sender.id === userId
      })
      if (receivedRequest) return 'received'
    }
    
    return 'none'
  }

  const getFriendStatusButton = (user: User) => {
    const status = getFriendStatus(user.id)
    
    switch (status) {
      case 'friends':
        return (
          <Badge variant="secondary" className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            Friends
          </Badge>
        )
      case 'sent':
        return (
          <Badge variant="outline" className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'received':
        return (
          <Button 
            size="sm"
            onClick={() => {
              const request = receivedRequests?.find(req => 
                req.sender.id === user.id && req.status === 'PENDING'
              )
              if (request) {
                handleRespondToRequest(request.id, 'ACCEPTED')
              }
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Accept Request
          </Button>
        )
      default:
        return (
          <Button 
            size="sm"
            onClick={() => sendFriendRequest(user.id)}
            disabled={pendingRequests.has(user.id)}
            variant={pendingRequests.has(user.id) ? "outline" : "default"}
          >
            {pendingRequests.has(user.id) ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Pending
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </>
            )}
          </Button>
        )
    }
  }

  const startConversation = async (friendId: string) => {
    try {
      const token = await getToken()
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
        toast.success('Conversation started')
        // Navigate to the conversation
        window.location.href = `/messages/${data.conversation.id}`
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to start conversation')
      }
    } catch (error) {
      logger.error('Error starting conversation:', error);
      toast.error('Failed to start conversation')
    }
  }

  // Goal setting handlers
  const handleOpenGoalModal = (friendId: string) => {
    // First try to find in enhanced friends (preferred)
    let friend = enhancedFriends.find(f => f.id === friendId)

    // If not found in enhanced friends, look in raw friends and create a basic enhanced friend
    if (!friend && friends) {
      const rawFriend = friends.find(f => f.friend.id === friendId)
      if (rawFriend) {
        friend = {
          id: rawFriend.friend.id,
          name: rawFriend.friend.name,
          username: rawFriend.friend.username,
          avatar: rawFriend.friend.avatar,
          isActive: true,
          friendshipCreatedAt: rawFriend.createdAt,
          desiredHangoutFrequency: null,
          hangoutStats: {
            lastHangoutDate: null,
            totalHangouts: 0
          },
          upcomingHangouts: [],
          goalStatus: {
            status: 'no-goal' as RelationshipStatus,
            days: null,
            text: 'Never'
          }
        }
      }
    }

    if (friend) {
      setGoalModalFriend(friend)
      setGoalModalOpen(true)
    }
  }

  const handleSaveGoal = async (frequency: HangoutFrequency | null) => {
    if (!goalModalFriend) return

    try {
      const token = await getToken()
      // Call the existing API endpoint
      const response = await fetch(`/api/friends/${goalModalFriend.id}/frequency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ frequency })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save goal')
      }

      const result = await response.json()

      // Update local state immediately for instant feedback
      setEnhancedFriends(prev => prev.map(friend => {
        if (friend.id === goalModalFriend.id) {
          return {
            ...friend,
            desiredHangoutFrequency: frequency
          }
        }
        return friend
      }))

      const frequencyLabels: Record<string, string> = {
        'MONTHLY': 'Monthly',
        'QUARTERLY': 'Quarterly',
        'SEMI_ANNUAL': 'Semi-Annual',
        'ANNUALLY': 'Annually',
        'SOMETIMES': 'Sometimes'
      }
      
      toast.success(frequency ? `Hangout goal set to ${frequencyLabels[frequency] || frequency}!` : 'Hangout goal removed!')
      
      // Close modal
      setGoalModalOpen(false)
      setGoalModalFriend(null)
      
      // Wait a moment for database to update, then refresh enhanced data to get updated goal status
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Refresh enhanced friend data to get updated goal status (this will merge with our local update)
      await fetchEnhancedFriendData()
    } catch (error) {
      logger.error('Error saving goal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save goal'
      toast.error(errorMessage)
      throw error
    }
  }

  // Respond to friend request
  const handleRespondToRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setIsResponding(requestId)
    try {
      await respondToFriendRequest(requestId, status)
      toast.success(status === 'ACCEPTED' ? 'Friend request accepted!' : 'Friend request declined')
      updateFriendStatuses()
      await refetch()
    } catch (error) {
      logger.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request')
    } finally {
      setIsResponding(null)
    }
  }

  // Message and invite handlers for new components
  const handleMessageFriend = async (friendId: string) => {
    await startConversation(friendId)
  }

  const handleInviteFriend = (friendId: string) => {
    // Navigate to create page with friend pre-selected
    window.location.href = `/create?invite=${friendId}`
  }

  const handleUnfriendClick = (friendship: UniversalFriend) => {
    setFriendToUnfriend({
      id: friendship.id,
      name: friendship.friend.name
    })
    setUnfriendDialogOpen(true)
  }

  const removeFriend = async () => {
    if (!friendToUnfriend) return

    try {
      setUnfriending(true)
      const response = await fetch(`/api/friends/${friendToUnfriend.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success(`${friendToUnfriend.name} has been removed from your friends`)
        setUnfriendDialogOpen(false)
        setFriendToUnfriend(null)
        loadFriends()
      } else {
        const error = await response.json()
        toast.error(error.error || error.message || 'Failed to remove friend')
      }
    } catch (error) {
      logger.error('Error removing friend:', error)
      toast.error('Failed to remove friend')
    } finally {
      setUnfriending(false)
    }
  }

  // TEMPORARY: Allow access to friends page for testing
  // TODO: Fix authentication properly
  if (!isSignedIn) {
    console.log('⚠️ User not authenticated, but allowing access to friends page for testing');
    // return (
    //   <div className="min-h-screen bg-background flex items-center justify-center">
    //     <Card className="w-full max-w-md">
    //       <CardHeader className="text-center">
    //         <CardTitle>Sign In Required</CardTitle>
    //       </CardHeader>
    //       <CardContent className="text-center">
    //         <p className="text-muted-foreground mb-4">
    //           Please sign in to view your friends and manage friend requests.
    //         </p>
    //         <Button onClick={() => window.location.href = '/signin'}>
    //           Sign In
    //         </Button>
    //       </CardContent>
    //     </Card>
    //   </div>
    // )
  }

  // TEMPORARY: Skip loading check for testing
  // TODO: Fix authentication properly
  if (!isLoaded) {
    console.log('⚠️ Clerk not loaded, but allowing access to friends page for testing');
    // return (
    //   <div className="min-h-screen bg-background flex items-center justify-center">
    //     <div className="text-center">
    //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
    //       <p>Loading...</p>
    //     </div>
    //   </div>
    // )
  }

  // TEMPORARY: Skip loading check for testing
  // TODO: Fix authentication properly
  if (loading) {
    console.log('⚠️ Still loading, but allowing access to friends page for testing');
    // return (
    //   <div className="min-h-screen bg-background flex items-center justify-center">
    //     <div className="text-center">
    //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
    //       <p>Loading friends...</p>
    //     </div>
    //   </div>
    // )
  }

  // Show loading state while auth is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50 p-4 sticky top-0 z-10">
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
            {!friends || friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-white mb-2">No friends yet</h3>
                <p className="text-gray-400 mb-4">Start by finding people to connect with</p>
                <Button onClick={() => setActiveTab("find")}>
                  Find People
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {isLoadingStats && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-xs text-gray-400">Loading friend activity...</p>
                  </div>
                )}
                {(() => {
                  try {
                    // Deduplicate friends by ID to prevent duplicates
                    const uniqueFriendsMap = new Map<string, EnhancedFriend>()
                    
                    // First, add enhanced friends (they have the most complete data)
                    enhancedFriends.forEach(friend => {
                      uniqueFriendsMap.set(friend.id, friend)
                    })
                    
                    // Then, add any friends from the raw list that aren't already in enhanced
                    if (friends && friends.length > 0) {
                      friends.forEach(f => {
                        if (!f || !f.friend) return
                        if (!uniqueFriendsMap.has(f.friend.id)) {
                          const basic: EnhancedFriend = {
                            id: f.friend.id,
                            name: f.friend.name || 'Unknown',
                            username: f.friend.username || 'unknown',
                            isActive: true,
                            friendshipCreatedAt: f.createdAt || new Date(),
                            desiredHangoutFrequency: null,
                            hangoutStats: {
                              lastHangoutDate: null,
                              totalHangouts: 0
                            },
                            upcomingHangouts: [],
                            goalStatus: {
                              status: 'no-goal' as RelationshipStatus,
                              days: null,
                              text: 'Never'
                            }
                          }
                          if (f.friend.avatar) {
                            basic.avatar = f.friend.avatar
                          }
                          uniqueFriendsMap.set(f.friend.id, basic)
                        }
                      })
                    }
                    
                    const friendsToDisplay = Array.from(uniqueFriendsMap.values())
                    const sections = groupFriendsByGoalStatus(friendsToDisplay)
                    return sections.map((section, index) => (
                      <FriendSection
                        key={section.title}
                        section={section}
                        onMessageFriend={handleMessageFriend}
                        onInviteFriend={handleInviteFriend}
                        onSetGoal={handleOpenGoalModal}
                        defaultExpanded={index === 0}
                      />
                    ))
                  } catch (error) {
                    logger.error('Error rendering friends:', error)
                    return (
                      <div className="text-center py-8">
                        <p className="text-red-400">Error loading friends. Please refresh the page.</p>
                      </div>
                    )
                  }
                })()}
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
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium"
                                >
                                  {isResponding === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Accept"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRespondToRequest(request.id, 'DECLINED')}
                                  disabled={isResponding === request.id}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-1.5 rounded-lg font-medium"
                                >
                                  {isResponding === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Decline"
                                  )}
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
                                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                                      Pending
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Sent {new Date(request.createdAt).toLocaleDateString()}
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
            <div>
              <h3 className="text-lg font-medium text-white mb-3">
                {searchQuery ? `Search Results` : 'All Users'} {isSearching && <Loader2 className="w-4 h-4 inline animate-spin ml-2" />}
              </h3>
              {searchResults.length === 0 && !isSearching ? (
                <div className="text-center py-8">
                  <UserSearch className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">
                    {searchQuery ? `No users found for "${searchQuery}"` : 'No users found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults
                    .filter(user => getFriendStatus(user.id) !== 'friends')
                    .map((user) => (
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
                              {(() => {
                                const status = friendStatuses.get(user.id) || 'none'
                                const isSending = sendingRequests.has(user.id)
                                
                                if (status === 'friends') {
                                  return (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="bg-green-600 text-white px-4 py-1.5 rounded-lg font-medium cursor-not-allowed"
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Friends
                                    </Button>
                                  )
                                } else if (status === 'pending') {
                                  return (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg font-medium cursor-not-allowed"
                                    >
                                      <Clock className="w-4 h-4 mr-1" />
                                      Pending
                                    </Button>
                                  )
                                } else if (status === 'received') {
                                  return (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium cursor-not-allowed"
                                    >
                                      <UserPlus className="w-4 h-4 mr-1" />
                                      Request Received
                                    </Button>
                                  )
                                } else {
                                  return (
                                    <Button
                                      size="sm"
                                      onClick={() => sendFriendRequest(user.id)}
                                      disabled={isSending}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium"
                                    >
                                      {isSending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <UserPlus className="w-4 h-4 mr-1" />
                                          Add Friend
                                        </>
                                      )}
                                    </Button>
                                  )
                                }
                              })()}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleMessageFriend(user.id)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
            </div>
        </TabsContent>
      </Tabs>

      {/* Unfriend Confirmation Dialog */}
      <Dialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Unfriend {friendToUnfriend?.name}?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to unfriend {friendToUnfriend?.name}? This will remove them from your friends list and you'll need to send a new friend request to reconnect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setUnfriendDialogOpen(false)
                setFriendToUnfriend(null)
              }}
              disabled={unfriending}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={removeFriend}
              disabled={unfriending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {unfriending ? 'Removing...' : 'Unfriend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Setting Modal */}
      {goalModalFriend && (
        <GoalSettingModal
          isOpen={goalModalOpen}
          onClose={() => {
            setGoalModalOpen(false)
            setGoalModalFriend(null)
          }}
          friendId={goalModalFriend.id}
          friendName={goalModalFriend.name}
          friendAvatar={goalModalFriend.avatar}
          currentFrequency={goalModalFriend.desiredHangoutFrequency}
          lastHangoutDate={goalModalFriend.hangoutStats.lastHangoutDate}
          goalStatus={goalModalFriend.goalStatus.status}
          onSave={handleSaveGoal}
        />
      )}
    </div>
  )
}
