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
  Check
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
  const { isSignedIn, isLoaded } = useAuth()
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
    if (username && isLoaded) {
      fetchProfileData()
    }
  }, [username, isLoaded]) // Removed currentUser to prevent infinite loops

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
      setIsOwnProfile(userData.data.profile.username === username)

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

      // Check friendship status
      if (!isOwnProfile && isSignedIn) {
        const friendshipResponse = await fetch(`/api/friends/status/${userData.data.profile.id}`)
        if (friendshipResponse.ok) {
          const friendshipData = await friendshipResponse.json()
          setIsFriend(friendshipData.isFriend)
          setFriendRequestSent(friendshipData.friendRequestSent)
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
                          <Button 
                            onClick={handleUnfriend}
                            variant="outline" 
                            className="border-gray-600 text-white hover:bg-gray-700"
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Unfriend
                          </Button>
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

        {/* Content Tabs */}
        <Tabs defaultValue="hangouts" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="hangouts" className="data-[state=active]:bg-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Hangouts ({userHangouts.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-gray-700">
              <Heart className="w-4 h-4 mr-2" />
              Events ({userEvents.length})
            </TabsTrigger>
            <TabsTrigger value="attended" className="data-[state=active]:bg-gray-700">
              <Users className="w-4 h-4 mr-2" />
              Attended ({attendedHangouts.length + attendedEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hangouts" className="space-y-4">
            {userHangouts.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-white mb-2">No hangouts yet</h3>
                  <p className="text-gray-400">This user hasn't created any hangouts.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {userHangouts.map((hangout) => (
                  <Card key={hangout.id} className="bg-gray-800 border-gray-700">
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
                          <h3 className="font-medium text-white mb-1">{hangout.title}</h3>
                          {hangout.description && (
                            <p className="text-gray-400 text-sm mb-2">{hangout.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{new Date(hangout.startTime).toLocaleDateString()}</span>
                            </div>
                            {hangout.location && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>{hangout.location}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{(hangout as any)._count?.participants || 0} participants</span>
                            </div>
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {userEvents.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
                  <p className="text-gray-400">This user hasn't created any events.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {userEvents.map((event) => (
                  <Card key={event.id} className="bg-gray-800 border-gray-700">
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
                          <h3 className="font-medium text-white mb-1">{event.title}</h3>
                          {event.description && (
                            <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{new Date(event.startTime).toLocaleDateString()}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{(event as any)._count?.participants || 0} participants</span>
                            </div>
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attended" className="space-y-4">
            {attendedHangouts.length === 0 && attendedEvents.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-white mb-2">No attended events</h3>
                  <p className="text-gray-400">This user hasn't attended any events yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {[...attendedHangouts, ...attendedEvents].map((item) => (
                  <Card key={item.id} className="bg-gray-800 border-gray-700">
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
                            <h3 className="font-medium text-white">{item.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {(item as any).type === 'HANGOUT' ? 'Hangout' : 'Event'}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{new Date(item.startTime).toLocaleDateString()}</span>
                            </div>
                            {item.location && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>{item.location}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{(item as any)._count?.participants || 0} participants</span>
                            </div>
                          </div>
                        </div>
                        <TileActions 
                          itemId={item.id}
                          itemType={(item as any).type === 'HANGOUT' ? 'hangout' : 'event'}
                          itemTitle={item.title}
                          itemDescription={item.description || ''}
                          itemImage={item.image || ''}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}