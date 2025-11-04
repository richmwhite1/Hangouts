'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  MapPin, 
  Calendar, 
  Users, 
  LogOut,
  Edit,
  Ticket,
  Heart,
  Coffee,
  Music,
  Camera,
  Gamepad2
} from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  username: string
  email: string
  avatar?: string
  bio?: string
  location?: string
  createdAt: string
}

interface Hangout {
  id: string
  title: string
  location: string
  startTime: string
  image?: string
  _count?: {
    participants: number
  }
}

export function ProfileClient() {
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [attendedEventsCount, setAttendedEventsCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      
      // Fetch current user
      const userRes = await fetch('/api/auth/me')
      if (!userRes.ok) throw new Error('Failed to fetch user')
      const userData = await userRes.json()
      
      // Fetch profile
      const profileRes = await fetch(`/api/profile?username=${userData.data.username}`)
      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      const profileData = await profileRes.json()
      
      setProfile(profileData.data.profile)
      setHangouts(profileData.data.hangouts || [])

      // Fetch user stats to get attended events count
      // Note: This uses the internal user ID, not Clerk ID
      if (profileData.data.profile?.id) {
        try {
          const statsRes = await fetch(`/api/users/${profileData.data.profile.id}/stats`)
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            if (statsData.success && statsData.data?.stats?.attendedEventsCount !== undefined) {
              setAttendedEventsCount(statsData.data.stats.attendedEventsCount)
            }
          }
        } catch (error) {
          // Silently fail - stats are optional
          // Stats fetch failed (non-critical) - silently continue
        }
      }
    } catch (error) {
      // Error fetching profile - user will see error state
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
            <p className="text-muted-foreground mb-6">Unable to load your profile</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    { label: 'Hangouts', value: hangouts.length, icon: Calendar },
    { label: 'Friends', value: '0', icon: Users },
    { label: 'Events', value: attendedEventsCount, icon: Ticket }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10 pb-20">
        {/* Profile Card */}
        <Card className="backdrop-blur-sm bg-card/95 border-primary/20 shadow-2xl">
          <CardContent className="p-8">
            {/* Avatar & Name */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
              <Avatar className="w-32 h-32 border-4 border-primary/30 shadow-xl">
                <AvatarImage src={profile.avatar || undefined} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/50">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <Badge variant="secondary" className="w-fit mx-auto md:mx-0">
                    @{profile.username}
                  </Badge>
                </div>

                {profile.location && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {profile.bio && (
                  <p className="text-muted-foreground max-w-2xl mb-4">
                    {profile.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Button variant="outline" size="sm" onClick={() => alert('Edit profile coming soon!')}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => signOut()}
                    className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Interests */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Coffee, label: 'Coffee' },
                  { icon: Music, label: 'Music' },
                  { icon: Camera, label: 'Photography' },
                  { icon: Gamepad2, label: 'Gaming' }
                ].map((interest, index) => (
                  <Badge 
                    key={index}
                    variant="outline" 
                    className="px-3 py-2 bg-primary/5 border-primary/20"
                  >
                    <interest.icon className="w-4 h-4 mr-2" />
                    {interest.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Hangouts */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Recent Hangouts
          </h2>

          {hangouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hangouts.slice(0, 6).map((hangout) => (
                <Link key={hangout.id} href={`/hangout/${hangout.id}`}>
                  <Card className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden bg-card/50 backdrop-blur-sm border-primary/20">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={hangout.image || '/default-hangout-friends.png'}
                        alt={hangout.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = '/default-hangout-friends.png'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                          {hangout.title}
                        </h3>
                        <div className="flex items-center justify-between text-white/80 text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{hangout.location}</span>
                          </div>
                          {hangout._count && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{hangout._count.participants}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No hangouts yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start creating hangouts to connect with friends!
                </p>
                <Link href="/create">
                  <Button>
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Your First Hangout
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}



