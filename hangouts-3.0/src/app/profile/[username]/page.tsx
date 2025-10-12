"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { User, Content as Hangout } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { TileActions } from '@/components/ui/tile-actions'
import { 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Heart, 
  MessageSquare, 
  Settings,
  UserPlus,
  UserMinus,
  Check,
  X
} from 'lucide-react'
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

export default function ProfilePage() {
  const params = useParams()
  const { user: currentUser, isAuthenticated } = useAuth()
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

  const username = params?.username as string

  useEffect(() => {
    if (username) {
      fetchProfileData()
    }
  }, [username, currentUser])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user profile
      const userResponse = await fetch(`/api/profile?username=${username}`)
      if (!userResponse.ok) {
        throw new Error('Failed to fetch profile')
      }
      const userData = await userResponse.json()
      setProfileUser(userData.data.profile)
      setIsOwnProfile(currentUser?.username === username)

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
      const eventsResponse = await fetch(`/api/users/${userResponse.user.id}/events`)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setUserEvents(eventsData.events || [])
      }

      // Fetch user's attended hangouts
      const attendedHangoutsResponse = await fetch(`/api/users/${userResponse.user.id}/attended-hangouts`)
      if (attendedHangoutsResponse.ok) {
        const attendedHangoutsData = await attendedHangoutsResponse.json()
        setAttendedHangouts(attendedHangoutsData.hangouts || [])
      }

      // Fetch user's attended events
      const attendedEventsResponse = await fetch(`/api/users/${userResponse.user.id}/attended-events`)
      if (attendedEventsResponse.ok) {
        const attendedEventsData = await attendedEventsResponse.json()
        setAttendedEvents(attendedEventsData.events || [])
      }

      // Check friendship status
      if (!isOwnProfile && currentUser) {
        const friendshipResponse = await fetch(`/api/friends/status/${userResponse.user.id}`)
        if (friendshipResponse.ok) {
          const friendshipData = await friendshipResponse.json()
          setIsFriend(friendshipData.isFriend)
          setFriendRequestSent(friendshipData.friendRequestSent)
        }
      }

    } catch (error) {
      logger.error('Error fetching profile data:', error);
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFriendRequest = async () => {
    if (!profileUser || isOwnProfile) return

    try {
      if (isFriend) {
        // Remove friend
        await fetch(`/api/friends/${profileUser.id}`, { method: 'DELETE' })
        setIsFriend(false)
      } else if (friendRequestSent) {
        // Cancel friend request
        await fetch(`/api/friends/requests/${profileUser.id}`, { method: 'DELETE' })
        setFriendRequestSent(false)
      } else {
        // Send friend request
        await fetch('/api/friends/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profileUser.id })
        })
        setFriendRequestSent(true)
      }
    } catch (error) {
      logger.error('Error handling friend request:', error);
    }
  }

  const handleRefresh = async () => {
    await fetchProfileData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderHangoutCard = (hangout: Hangout) => (
    <Link key={`hangout-${hangout.id}`} href={`/hangout/${hangout.id}`}>
      <Card className="bg-gray-800 border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        {hangout.image && (
          <div className="relative h-32 bg-gray-700">
            <img
              src={hangout.image}
              alt={hangout.title || hangout.activity}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              Hangout
            </div>
            {/* Action Buttons - Bottom Right */}
            <div className="absolute bottom-2 right-2">
              <TileActions
                itemId={hangout.id}
                itemType="hangout"
                onSave={(id, type) => {
                  // TODO: Implement save functionality
                  // console.log('Save hangout:', id, type); // Removed for production
                }}
                onUnsave={(id, type) => {
                  // TODO: Implement unsave functionality
                  // console.log('Unsave hangout:', id, type); // Removed for production
                }}
              />
            </div>
          </div>
        )}
        <CardContent className="p-3">
          <h3 className="font-semibold text-white text-sm mb-1 truncate">
            {hangout.title || hangout.activity}
          </h3>
          <p className="text-gray-400 text-xs mb-2 line-clamp-2">
            {hangout.description}
          </p>
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="truncate">{hangout.location}</span>
          </div>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <Clock className="w-3 h-3 mr-1" />
            <span>{formatDate(hangout.date)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  const renderEventCard = (event: Event) => (
    <Link key={`event-${event.id}`} href={`/event/${event.id}`}>
      <Card className="bg-gray-800 border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        {event.coverImage && (
          <div className="relative h-32 bg-gray-700">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              Event
            </div>
            {/* Action Buttons - Bottom Right */}
            <div className="absolute bottom-2 right-2">
              <TileActions
                itemId={event.id}
                itemType="event"
                onSave={(id, type) => {
                  // TODO: Implement save functionality
                  // console.log('Save event:', id, type); // Removed for production
                }}
                onUnsave={(id, type) => {
                  // TODO: Implement unsave functionality
                  // console.log('Unsave event:', id, type); // Removed for production
                }}
              />
            </div>
          </div>
        )}
        <CardContent className="p-3">
          <h3 className="font-semibold text-white text-sm mb-1 truncate">
            {event.title}
          </h3>
          <p className="text-gray-400 text-xs mb-2 line-clamp-2">
            {event.description}
          </p>
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <Clock className="w-3 h-3 mr-1" />
            <span>{formatDate(event.startDate)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-800 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-800 rounded mb-2"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'User not found'}</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-4xl mx-auto p-4">
          {/* Profile Header */}
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <Avatar className="w-24 h-24 rounded-lg">
                  <AvatarImage src={profileUser.avatar || '/placeholder-avatar.png'} alt={profileUser.name} />
                  <AvatarFallback className="text-2xl rounded-lg">{profileUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-white">{profileUser.name}</h1>
                      <p className="text-gray-400">@{profileUser.username}</p>
                      {profileUser.bio && (
                        <p className="text-gray-300 mt-2">{profileUser.bio}</p>
                      )}
                    </div>
                    
                    {!isOwnProfile && isAuthenticated && (
                      <div className="flex space-x-2 mt-4 md:mt-0">
                        <Button
                          onClick={handleFriendRequest}
                          variant={isFriend ? "destructive" : "default"}
                          size="sm"
                        >
                          {isFriend ? (
                            <>
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove Friend
                            </>
                          ) : friendRequestSent ? (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Cancel Request
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Add Friend
                            </>
                          )}
                        </Button>
                        
                        <Link href={`/messages?user=${profileUser.username}`}>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {profileUser.location && (
                    <div className="flex items-center text-gray-400 mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{profileUser.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold text-white">{stats.friendsCount}</div>
                <div className="text-sm text-gray-400">Friends</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-white">{stats.hostedHangoutsCount}</div>
                <div className="text-sm text-gray-400">Hosted Hangouts</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <Heart className="w-6 h-6 mx-auto mb-2 text-red-400" />
                <div className="text-2xl font-bold text-white">{stats.attendedHangoutsCount}</div>
                <div className="text-sm text-gray-400">Attended</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-white">{stats.hostedEventsCount}</div>
                <div className="text-sm text-gray-400">Hosted Events</div>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="hosted" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="hosted" className="data-[state=active]:bg-purple-600">
                Hosted
              </TabsTrigger>
              <TabsTrigger value="attended" className="data-[state=active]:bg-purple-600">
                Attended
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hosted" className="mt-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Hosted Hangouts & Events</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userHangouts.map(renderHangoutCard)}
                  {userEvents.map(renderEventCard)}
                </div>
                {userHangouts.length === 0 && userEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No hosted content</h3>
                    <p className="text-gray-400">This user hasn't hosted any hangouts or events yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attended" className="mt-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Attended Hangouts & Events</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {attendedHangouts.map(renderHangoutCard)}
                  {attendedEvents.map(renderEventCard)}
                </div>
                {attendedHangouts.length === 0 && attendedEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No attended content</h3>
                    <p className="text-gray-400">This user hasn't attended any hangouts or events yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">All Activity</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...userHangouts, ...userEvents, ...attendedHangouts, ...attendedEvents]
                    .sort((a, b) => new Date(b.createdAt || b.date || b.startDate).getTime() - new Date(a.createdAt || a.date || a.startDate).getTime())
                    .map(item => 
                      'venue' in item ? renderEventCard(item) : renderHangoutCard(item)
                    )}
                </div>
                {userHangouts.length === 0 && userEvents.length === 0 && attendedHangouts.length === 0 && attendedEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No activity</h3>
                    <p className="text-gray-400">This user hasn't participated in any hangouts or events yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </div>
  )
}

