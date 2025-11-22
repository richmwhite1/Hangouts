'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Sparkles, 
  MapPin, 
  Users, 
  Trophy,
  Calendar,
  Camera,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import Image from 'next/image'

interface MemoryHighlightsProps {
  userId: string
}

interface Highlights {
  mostMemorableHangout: {
    id: string
    title: string
    location?: string
    startTime: string
    image?: string
    photoCount: number
    commentCount: number
    participantCount: number
    engagementScore: number
  } | null
  favoriteLocation: {
    location: string
    visitCount: number
    lastVisit: string
    image?: string
  } | null
  strongestConnection: {
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    hangoutCount: number
    firstHangout?: string
    lastHangout?: string
  } | null
  milestones: Array<{
    number: number
    hangout: {
      id: string
      title: string
      startTime: string
      image?: string
    }
  }>
}

export function MemoryHighlights({ userId }: MemoryHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHighlights()
  }, [userId])

  const fetchHighlights = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/users/${userId}/highlights`)
      if (!response.ok) {
        throw new Error('Failed to fetch highlights')
      }
      const data = await response.json()
      if (data.success) {
        setHighlights(data.data.highlights)
      } else {
        throw new Error(data.error || 'Failed to fetch highlights')
      }
    } catch (err) {
      logger.error('Error fetching highlights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load highlights')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/3" />
            <div className="h-32 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !highlights) {
    return null // Silently fail - highlights are optional
  }

  const hasAnyHighlights = highlights.mostMemorableHangout || 
    highlights.favoriteLocation || 
    highlights.strongestConnection || 
    highlights.milestones.length > 0

  if (!hasAnyHighlights) {
    return null
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Memory Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Most Memorable Hangout */}
        {highlights.mostMemorableHangout && (
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white">Most Memorable Hangout</h3>
            </div>
            <Link href={`/hangout/${highlights.mostMemorableHangout.id}`}>
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3 cursor-pointer hover:opacity-90 transition-opacity">
                {highlights.mostMemorableHangout.image ? (
                  <Image
                    src={highlights.mostMemorableHangout.image}
                    alt={highlights.mostMemorableHangout.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-purple-400" />
                  </div>
                )}
              </div>
            </Link>
            <div>
              <h4 className="text-white font-medium mb-1">
                {highlights.mostMemorableHangout.title}
              </h4>
              {highlights.mostMemorableHangout.location && (
                <p className="text-sm text-gray-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  {highlights.mostMemorableHangout.location}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Camera className="w-4 h-4" />
                  <span>{highlights.mostMemorableHangout.photoCount} photos</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{highlights.mostMemorableHangout.commentCount} comments</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{highlights.mostMemorableHangout.participantCount} people</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid of other highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Favorite Location */}
          {highlights.favoriteLocation && (
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Favorite Spot</h3>
              </div>
              <p className="text-white font-medium mb-1">
                {highlights.favoriteLocation.location}
              </p>
              <p className="text-sm text-gray-400">
                Visited {highlights.favoriteLocation.visitCount} times
              </p>
            </div>
          )}

          {/* Strongest Connection */}
          {highlights.strongestConnection && (
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-semibold text-white">Strongest Connection</h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={highlights.strongestConnection.user.avatar} />
                  <AvatarFallback>
                    {highlights.strongestConnection.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    {highlights.strongestConnection.user.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {highlights.strongestConnection.hangoutCount} hangouts together
                  </p>
                </div>
              </div>
              <Link href={`/profile/${highlights.strongestConnection.user.username}`}>
                <Button size="sm" variant="outline" className="w-full mt-2">
                  View Profile
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Milestones */}
        {highlights.milestones.length > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-yellow-600/20 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white">Milestones</h3>
            </div>
            <div className="space-y-2">
              {highlights.milestones.map((milestone) => (
                <Link
                  key={milestone.number}
                  href={`/hangout/${milestone.hangout.id}`}
                  className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-600/20 to-orange-600/20 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {milestone.number}{milestone.number === 1 ? 'st' : milestone.number === 2 ? 'nd' : milestone.number === 3 ? 'rd' : 'th'} Hangout
                    </p>
                    <p className="text-sm text-gray-400">{milestone.hangout.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

