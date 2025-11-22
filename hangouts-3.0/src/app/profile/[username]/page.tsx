"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { User, Content as Hangout } from '@/types/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TileActions } from '@/components/ui/tile-actions'
import { 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Heart, 
  Settings,
  UserPlus,
  UserMinus,
  Check,
  History,
  MessageSquare
} from 'lucide-react'
import { FriendHangoutsList } from '@/components/friend-hangouts-list'
import { SharedActivitiesFeed } from '@/components/shared-activities-feed'
import { ProfileFriendsList } from '@/components/profile-friends-list'
import { FriendProfileFriendsList } from '@/components/friend-profile-friends-list'
import { ProfileInsights } from '@/components/profile-insights'
import { MemoryHighlights } from '@/components/memory-highlights'
import Link from 'next/link'

import { logger } from '@/lib/logger'

interface ProfileStats {
  friendsCount: number
  hostedHangoutsCount: number
  attendedHangoutsCount: number
  hostedEventsCount: number
  attendedEventsCount: number
  totalLikes: number
  totalComments: number
}

interface Event {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  creator: {
    name: string
    username: string
    avatar?: string
  }
  privacyLevel?: string
  maxParticipants?: number
  image?: string
  photos?: string[]
  participants?: any[]
  _count?: {
    participants: number
  }
}

export default function ProfilePage() {
  const params = useParams()
  const { isSignedIn, isLoaded, userId: currentClerkUserId } = useAuth()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [stats, setStats] = useState<ProfileStats>({
    friendsCount: 0,
    hostedHangoutsCount: 0,
    attendedHangoutsCount: 0,
    hostedEventsCount: 0,
    attendedEventsCount: 0,
    totalLikes: 0,
    totalComments: 0
  })
  const [userHangouts, setUserHangouts] = useState<Hangout[]>([])
  const [userEvents, setUserEvents] = useState<Event[]>([])
  const [attendedHangouts, setAttendedHangouts] = useState<Hangout[]>([])
  const [attendedEvents, setAttendedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFriend, setIsFriend] = useState(false)
  const [friendRequestSent, setFriendRequestSent] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [friendStats, setFriendStats] = useState<{
    lastHangoutDate?: string
    totalHangouts: number
    invitedCount: number
    wasInvitedCount: number
  } | null>(null)
  const [sharedHangouts, setSharedHangouts] = useState<any[]>([])
  const [sharedEvents, setSharedEvents] = useState<any[]>([])
  const [loadingSharedHangouts, setLoadingSharedHangouts] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [mutualFriends, setMutualFriends] = useState<any[]>([])
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0)
  const [loadingMutualFriends, setLoadingMutualFriends] = useState(false)

  const username = params?.username as string

  useEffect(() => {
    if (username && isLoaded) {
      fetchProfileData()
    }
  }, [username, isLoaded, isSignedIn]) // Include isSignedIn to re-fetch when auth state changes

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch current user ID if signed in
      let fetchedCurrentUserId: string | null = null
      if (isSignedIn) {
        try {
          const currentUserResponse = await fetch('/api/auth/me')
          if (currentUserResponse.ok) {
            const currentUserData = await currentUserResponse.json()
            if (currentUserData.success) {
              // Support both 'data' and 'user' response formats for backward compatibility
              const user = currentUserData.data || currentUserData.user
              if (user?.id) {
                fetchedCurrentUserId = user.id
                setCurrentUserId(fetchedCurrentUserId)
              }
            }
          }
        } catch (err) {
          logger.error('Error fetching current user:', err)
        }
      }

      // Fetch user profile
      const userResponse = await fetch(`/api/profile?username=${username}`)
      if (!userResponse.ok) {
        throw new Error('Failed to fetch profile')
      }
      const userData = await userResponse.json()
      setProfileUser(userData.data.profile)
      
      // Enhanced profile detection with multiple fallback checks
      let profileIsOwn = false
      if (isSignedIn) {
        if (fetchedCurrentUserId) {
          // Primary check: Compare database IDs
          profileIsOwn = userData.data.profile.id === fetchedCurrentUserId
          
          // Fallback: Check Clerk ID if database ID doesn't match
          if (!profileIsOwn && userData.data.profile.clerkId && currentClerkUserId) {
            profileIsOwn = userData.data.profile.clerkId === currentClerkUserId
          }
        }
        
        // Fallback: Check Clerk ID directly (even if fetchedCurrentUserId is null)
        if (!profileIsOwn && userData.data.profile.clerkId && currentClerkUserId) {
          profileIsOwn = userData.data.profile.clerkId === currentClerkUserId
        }
        
        // Fallback: Check username match (try to get current user's username)
        if (!profileIsOwn && username) {
          try {
            const currentUserCheck = await fetch('/api/auth/me')
            if (currentUserCheck.ok) {
              const currentUserData = await currentUserCheck.json()
              if (currentUserData.success) {
                const user = currentUserData.data || currentUserData.user
                if (user?.username === username) {
                  profileIsOwn = true
                }
              }
            }
          } catch (err) {
            // Silently fail - username check is just a fallback
          }
        }
      }
      
      setIsOwnProfile(profileIsOwn)
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Profile Detection Debug:', {
          fetchedCurrentUserId,
          profileUserId: userData.data.profile.id,
          profileUsername: userData.data.profile.username,
          profileClerkId: userData.data.profile.clerkId,
          currentClerkUserId,
          currentUsername: username,
          isOwnProfile: profileIsOwn,
          isSignedIn
        })
      }

      // Fetch user stats
      const statsResponse = await fetch(`/api/users/${userData.data.profile.id}/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      // Fetch user's hosted hangouts
      const hangoutsResponse = await fetch(`/api/users/${userData.data.profile.id}/hangouts`)
      if (hangoutsResponse.ok) {
        const hangoutsData = await hangoutsResponse.json()
        setUserHangouts(hangoutsData.hangouts || [])
      }

      // Fetch user's hosted events
      const eventsResponse = await fetch(`/api/users/${userData.data.profile.id}/events`)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setUserEvents(eventsData.events || [])
      }

      // Fetch user's attended hangouts
      const attendedHangoutsResponse = await fetch(`/api/users/${userData.data.profile.id}/attended-hangouts`)
      if (attendedHangoutsResponse.ok) {
        const attendedHangoutsData = await attendedHangoutsResponse.json()
        setAttendedHangouts(attendedHangoutsData.hangouts || [])
      }

      // Fetch user's attended events
      const attendedEventsResponse = await fetch(`/api/users/${userData.data.profile.id}/attended-events`)
      if (attendedEventsResponse.ok) {
        const attendedEventsData = await attendedEventsResponse.json()
        setAttendedEvents(attendedEventsData.events || [])
      }

      // Only fetch friends list if it's the user's own profile
      // For friend profiles, we'll fetch their friends separately
      if (isSignedIn && profileIsOwn && fetchedCurrentUserId) {
        try {
          setLoadingFriends(true)
          const friendsResponse = await fetch('/api/friends')
          if (friendsResponse.ok) {
            const friendsData = await friendsResponse.json()
            if (friendsData.success) {
              const friendsList = friendsData.friends || []
              setFriends(friendsList)
            } else {
              logger.error('Friends API returned success=false:', friendsData)
              if (process.env.NODE_ENV === 'development') {
                console.error('Friends API error response:', friendsData)
              }
            }
          } else {
            const errorText = await friendsResponse.text()
            logger.error('Friends API error:', friendsResponse.status, errorText)
            if (process.env.NODE_ENV === 'development') {
              console.error('Friends API HTTP error:', friendsResponse.status, errorText)
            }
          }
        } catch (err) {
          logger.error('Error fetching friends:', err)
        } finally {
          setLoadingFriends(false)
        }
      } else {
        // Not own profile, don't try to fetch current user's friends
        setLoadingFriends(false)
      }

      // Check friendship status and fetch friend stats if they're a friend
      // Only check if it's NOT the user's own profile
      if (!profileIsOwn && isSignedIn) {
        try {
          const friendshipResponse = await fetch(`/api/friends/status/${userData.data.profile.id}`)
          if (friendshipResponse.ok) {
            const friendshipData = await friendshipResponse.json()
            setIsFriend(friendshipData.isFriend || false)
            setFriendRequestSent(friendshipData.friendRequestSent || false)
          
            // Fetch mutual friends
            if (fetchedCurrentUserId) {
              try {
                setLoadingMutualFriends(true)
                const mutualFriendsResponse = await fetch(`/api/users/${userData.data.profile.id}/mutual-friends`)
                if (mutualFriendsResponse.ok) {
                  const mutualFriendsData = await mutualFriendsResponse.json()
                  if (mutualFriendsData.success) {
                    setMutualFriends(mutualFriendsData.data.mutualFriends || [])
                    setMutualFriendsCount(mutualFriendsData.data.count || 0)
                  }
                }
              } catch (err) {
                logger.error('Error fetching mutual friends:', err)
              } finally {
                setLoadingMutualFriends(false)
              }
            }
          
            // If they're a friend, fetch relationship stats
            if (friendshipData.isFriend) {
              try {
                const statsResponse = await fetch(`/api/friends/${userData.data.profile.id}/stats`)
                if (statsResponse.ok) {
                  const statsData = await statsResponse.json()
                  if (statsData.success) {
                    setFriendStats(statsData.stats)
                  }
                }
                
                // Fetch shared hangouts and events
                setLoadingSharedHangouts(true)
                const [hangoutsResponse, eventsResponse] = await Promise.all([
                  fetch(`/api/friends/${userData.data.profile.id}/hangouts`),
                  fetch(`/api/friends/${userData.data.profile.id}/events`)
                ])
                
                if (hangoutsResponse.ok) {
                  const hangoutsData = await hangoutsResponse.json()
                  if (hangoutsData.success) {
                    setSharedHangouts(hangoutsData.hangouts || [])
                  }
                }
                
                if (eventsResponse.ok) {
                  const eventsData = await eventsResponse.json()
                  if (eventsData.success) {
                    setSharedEvents(eventsData.events || [])
                  }
                }
              } catch (err) {
                logger.error('Error fetching friend stats:', err)
              } finally {
                setLoadingSharedHangouts(false)
              }
            }
          }
        } catch (err) {
          logger.error('Error checking friendship status:', err)
        }
      }
    } catch (err) {
      logger.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFriendRequest = async () => {
    if (!profileUser) return

    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profileUser.id })
      })

      if (response.ok) {
        setFriendRequestSent(true)
      }
    } catch (err) {
      logger.error('Error sending friend request:', err);
    }
  }

  const handleUnfriend = async () => {
    if (!profileUser) return

    try {
      const response = await fetch('/api/friends/unfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profileUser.id })
      })

      if (response.ok) {
        setIsFriend(false)
        setFriendRequestSent(false)
      }
    } catch (err) {
      logger.error('Error unfriending:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Profile not found</h1>
          <p className="text-gray-400 mb-4">The user you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profileUser.avatar || "/placeholder-avatar.png"} alt={profileUser.name} />
                <AvatarFallback className="text-2xl">{profileUser.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white">{profileUser.name}</h1>
                    <p className="text-gray-400">@{profileUser.username}</p>
                    {profileUser.bio && (
                      <p className="text-gray-300 mt-2">{profileUser.bio}</p>
                    )}
                    {profileUser.location && (
                      <div className="flex items-center mt-2 text-gray-400">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{profileUser.location}</span>
                      </div>
                    )}
                    {/* Mutual Friends Display */}
                    {!isOwnProfile && isSignedIn && mutualFriendsCount > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex -space-x-2">
                          {mutualFriends.slice(0, 3).map((friend) => (
                            <Avatar key={friend.id} className="w-6 h-6 border-2 border-gray-800">
                              <AvatarImage src={friend.avatar} />
                              <AvatarFallback className="text-xs">
                                {friend.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">
                          {mutualFriendsCount} mutual friend{mutualFriendsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isOwnProfile ? (
                      <Link href="/profile">
                        <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>
                    ) : (
                      <div className="flex space-x-2">
                        {isFriend ? (
                          <>
                            <Link href={`/create?with=${profileUser.id}`}>
                              <Button className="bg-blue-600 hover:bg-blue-700">
                                <Calendar className="w-4 h-4 mr-2" />
                                Create Hangout
                              </Button>
                            </Link>
                            <Link href={`/messages?user=${profileUser.id}`}>
                              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Message
                              </Button>
                            </Link>
                            <Button 
                              onClick={handleUnfriend}
                              variant="outline" 
                              className="border-gray-600 text-white hover:bg-gray-700"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Unfriend
                            </Button>
                          </>
                        ) : friendRequestSent ? (
                          <Button disabled variant="outline" className="border-gray-600 text-gray-400">
                            <Check className="w-4 h-4 mr-2" />
                            Request Sent
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleFriendRequest}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Friend
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.friendsCount}</div>
                    <div className="text-sm text-gray-400">Friends</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.hostedHangoutsCount}</div>
                    <div className="text-sm text-gray-400">Hosted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.attendedHangoutsCount}</div>
                    <div className="text-sm text-gray-400">Attended</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.totalLikes}</div>
                    <div className="text-sm text-gray-400">Likes</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary Section - Show for own profile */}
        {isOwnProfile && (
          <>
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Activity Summary
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.hostedHangoutsCount + stats.hostedEventsCount}</div>
                    <div className="text-sm text-gray-400">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.attendedHangoutsCount + stats.attendedEventsCount}</div>
                    <div className="text-sm text-gray-400">Attended</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.friendsCount}</div>
                    <div className="text-sm text-gray-400">Friends</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.totalLikes}</div>
                    <div className="text-sm text-gray-400">Likes Received</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.hostedHangoutsCount}</div>
                    <div className="text-sm text-gray-400">Hangouts Hosted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.hostedEventsCount}</div>
                    <div className="text-sm text-gray-400">Events Hosted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{stats.totalComments}</div>
                    <div className="text-sm text-gray-400">Comments</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights Dashboard - Show for own profile */}
            {currentUserId && (
              <>
                <div className="mb-6">
                  <ProfileInsights userId={currentUserId} />
                </div>
                {/* Memory Highlights - Show for own profile */}
                <div className="mb-6">
                  <MemoryHighlights userId={currentUserId} />
                </div>
              </>
            )}
          </>
        )}

        {/* Activities Together Section - Only show for friends */}
        {isFriend && friendStats && !isOwnProfile && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Activities Together
                </h2>
                <Link href={`/create?with=${profileUser.id}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Hangout
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{friendStats.totalHangouts}</div>
                  <div className="text-sm text-gray-400">Total Hangouts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{friendStats.invitedCount}</div>
                  <div className="text-sm text-gray-400">You Invited</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{friendStats.wasInvitedCount}</div>
                  <div className="text-sm text-gray-400">They Invited</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {friendStats.lastHangoutDate 
                      ? new Date(friendStats.lastHangoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Never'}
                  </div>
                  <div className="text-sm text-gray-400">Last Hangout</div>
                </div>
              </div>

              {friendStats.lastHangoutDate && (
                <p className="text-sm text-gray-400 text-center">
                  Last hung out {new Date(friendStats.lastHangoutDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Summary - Show for own profile */}
        {isOwnProfile && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{friends.length}</div>
                  <div className="text-sm text-gray-400">Friends</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userHangouts.length}</div>
                  <div className="text-sm text-gray-400">Hangouts Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userEvents.length}</div>
                  <div className="text-sm text-gray-400">Events Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{attendedHangouts.length + attendedEvents.length}</div>
                  <div className="text-sm text-gray-400">Attending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs 
          defaultValue={
            isOwnProfile 
              ? "friends" 
              : (isFriend && !isOwnProfile) 
                ? "together" 
                : "hangouts"
          } 
          className="space-y-6"
        >
          <TabsList className="bg-gray-800 border-gray-700">
            {/* Show Friends tab only on own profile */}
            {isOwnProfile && (
              <TabsTrigger value="friends" className="data-[state=active]:bg-gray-700">
                <Users className="w-4 h-4 mr-2" />
                Friends {friends.length > 0 && `(${friends.length})`}
              </TabsTrigger>
            )}
            {/* Show Together tab when viewing a friend's profile - should be first/visible */}
            {!isOwnProfile && isFriend && (
              <TabsTrigger value="together" className="data-[state=active]:bg-gray-700">
                <History className="w-4 h-4 mr-2" />
                Together ({sharedHangouts.length + sharedEvents.length})
              </TabsTrigger>
            )}
            {/* Show Friends tab for friend profiles (read-only, their friends) */}
            {!isOwnProfile && (
              <TabsTrigger value="friends" className="data-[state=active]:bg-gray-700">
                <Users className="w-4 h-4 mr-2" />
                Friends
              </TabsTrigger>
            )}
            {/* Always show these tabs for all profiles */}
            <TabsTrigger value="hangouts" className="data-[state=active]:bg-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Hangouts {isOwnProfile && `(${userHangouts.length})`}
              {!isOwnProfile && `(${userHangouts.length})`}
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-gray-700">
              <Heart className="w-4 h-4 mr-2" />
              Events {isOwnProfile && `(${userEvents.length})`}
              {!isOwnProfile && `(${userEvents.length})`}
            </TabsTrigger>
            <TabsTrigger value="attended" className="data-[state=active]:bg-gray-700">
              <Users className="w-4 h-4 mr-2" />
              Attended {isOwnProfile && `(${attendedHangouts.length + attendedEvents.length})`}
              {!isOwnProfile && `(${attendedHangouts.length + attendedEvents.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Friends tab content - editable for own profile, read-only for friend profiles */}
          <TabsContent value="friends" className="space-y-4">
            {isOwnProfile ? (
              // Own profile: Show editable friends list
              loadingFriends ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-700" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-700 rounded w-1/3" />
                            <div className="h-3 bg-gray-700 rounded w-1/2" />
                            <div className="h-3 bg-gray-700 rounded w-2/3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error && error.includes('friends') ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">
                      Refresh Page
                    </Button>
                  </CardContent>
                </Card>
              ) : currentUserId ? (
                <ProfileFriendsList currentUserId={currentUserId} />
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">Loading friends...</p>
                  </CardContent>
                </Card>
              )
            ) : (
              // Friend profile: Show read-only friends list
              profileUser ? (
                <FriendProfileFriendsList userId={profileUser.id} />
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">Loading friends...</p>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>

          {isFriend && !isOwnProfile && (
            <TabsContent value="together" className="space-y-0">
              {currentUserId && profileUser ? (
                <SharedActivitiesFeed 
                  friendId={profileUser.id} 
                  currentUserId={currentUserId} 
                />
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">Loading shared activities...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="hangouts" className="space-y-4">
            {userHangouts.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isOwnProfile ? "Your hangout story starts here" : "No hangouts yet"}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile 
                      ? "Create your first hangout and start making memories with friends"
                      : "This user hasn't created any hangouts yet."}
                  </p>
                  {isOwnProfile && (
                    <Link href="/create">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Calendar className="w-4 h-4 mr-2" />
                        Create Your First Hangout
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {userHangouts.map((hangout) => (
                  <Link key={hangout.id} href={`/hangout/${hangout.id}`}>
                    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          {hangout.image && (
                            <img 
                              src={hangout.image} 
                              alt={hangout.title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium text-white mb-1 hover:text-blue-400 transition-colors">{hangout.title}</h3>
                            {hangout.description && (
                              <p className="text-gray-400 text-sm mb-2 line-clamp-2">{hangout.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{new Date(hangout.startTime).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}</span>
                              </div>
                              {hangout.location && (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  <span>{hangout.location}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{(hangout as any)._count?.participants || 0} participant{(hangout as any)._count?.participants !== 1 ? 's' : ''}</span>
                              </div>
                              {isOwnProfile && (
                                <Badge variant="outline" className="text-xs">
                                  {hangout.userId === currentUserId ? 'Created by you' : 'Attending'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <TileActions 
                            itemId={hangout.id}
                            itemType="hangout"
                            itemTitle={hangout.title}
                            itemDescription={hangout.description || ''}
                            itemImage={hangout.image || ''}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {userEvents.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center">
                    <Heart className="w-10 h-10 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isOwnProfile ? "No events created yet" : "No events yet"}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile 
                      ? "Discover and share amazing events with your friends"
                      : "This user hasn't created any events yet."}
                  </p>
                  {isOwnProfile && (
                    <Link href="/create">
                      <Button variant="outline" className="border-pink-600 text-pink-400 hover:bg-pink-600/10">
                        <Heart className="w-4 h-4 mr-2" />
                        Discover Events
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {userEvents.map((event) => (
                  <Link key={event.id} href={`/event/${event.id}`}>
                    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          {event.image && (
                            <img 
                              src={event.image} 
                              alt={event.title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-white hover:text-pink-400 transition-colors">{event.title}</h3>
                              <Badge variant="outline" className="text-xs border-pink-600/50 text-pink-300">
                                Event
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-gray-400 text-sm mb-2 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{new Date(event.startTime).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{(event as any)._count?.participants || 0} participant{(event as any)._count?.participants !== 1 ? 's' : ''}</span>
                              </div>
                              {isOwnProfile && (
                                <Badge variant="outline" className="text-xs">
                                  Created by you
                                </Badge>
                              )}
                            </div>
                          </div>
                          <TileActions 
                            itemId={event.id}
                            itemType="event"
                            itemTitle={event.title}
                            itemDescription={event.description || ''}
                            itemImage={event.image || ''}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attended" className="space-y-4">
            {attendedHangouts.length === 0 && attendedEvents.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center">
                    <Users className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isOwnProfile ? "Start joining activities" : "No attended events"}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile 
                      ? "RSVP to hangouts and events to see them here"
                      : "This user hasn't attended any events yet."}
                  </p>
                  {isOwnProfile && (
                    <Link href="/">
                      <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/10">
                        <Users className="w-4 h-4 mr-2" />
                        Browse Feed
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {[...attendedHangouts, ...attendedEvents].map((item) => {
                  const isHangout = (item as any).type === 'HANGOUT' || !(item as any).type
                  const itemUrl = isHangout ? `/hangout/${item.id}` : `/event/${item.id}`
                  
                  return (
                    <Link key={item.id} href={itemUrl}>
                      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-white hover:text-blue-400 transition-colors">{item.title}</h3>
                                <Badge variant="outline" className={`text-xs ${
                                  isHangout 
                                    ? 'border-blue-600/50 text-blue-300' 
                                    : 'border-pink-600/50 text-pink-300'
                                }`}>
                                  {isHangout ? 'Hangout' : 'Event'}
                                </Badge>
                                {isOwnProfile && (
                                  <Badge variant="outline" className="text-xs border-green-600/50 text-green-300">
                                    Attending
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>{new Date(item.startTime).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}</span>
                                </div>
                                {item.location && (
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    <span>{item.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  <span>{(item as any)._count?.participants || 0} participant{(item as any)._count?.participants !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                            <TileActions 
                              itemId={item.id}
                              itemType={isHangout ? 'hangout' : 'event'}
                              itemTitle={item.title}
                              itemDescription={item.description || ''}
                              itemImage={item.image || ''}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}