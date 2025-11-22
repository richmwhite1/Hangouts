'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin, 
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface ProfileInsightsProps {
  userId: string
}

interface Insights {
  hangoutsThisMonth: number
  hangoutsLastMonth: number
  monthlyTrend: number
  mostFrequentPartner: {
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    count: number
  } | null
  favoriteLocation: {
    location: string
    count: number
  } | null
  busiestDay: string | null
  friendsToReconnect: Array<{
    friendId: string
    friendName: string
    friendUsername: string
    friendAvatar?: string
    daysSince: number | null
    lastHangoutDate: string | null
  }>
}

export function ProfileInsights({ userId }: ProfileInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [userId])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/users/${userId}/insights`)
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }
      const data = await response.json()
      if (data.success) {
        setInsights(data.data.insights)
      } else {
        throw new Error(data.error || 'Failed to fetch insights')
      }
    } catch (err) {
      logger.error('Error fetching insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insights')
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
            <div className="h-4 bg-gray-700 rounded w-1/2" />
            <div className="h-4 bg-gray-700 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !insights) {
    return null // Silently fail - insights are optional
  }

  return (
    <div className="space-y-6">
      {/* Monthly Stats */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">
              {insights.hangoutsThisMonth}
            </span>
            <span className="text-gray-400">hangouts</span>
            {insights.monthlyTrend !== 0 && (
              <div className={`flex items-center gap-1 ml-auto ${
                insights.monthlyTrend > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {insights.monthlyTrend > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {Math.abs(insights.monthlyTrend)} from last month
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Frequent Partner */}
        {insights.mostFrequentPartner && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Most frequent partner</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={insights.mostFrequentPartner.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {insights.mostFrequentPartner.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white font-medium">
                      {insights.mostFrequentPartner.user.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {insights.mostFrequentPartner.count} hangouts together
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorite Location */}
        {insights.favoriteLocation && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Favorite spot</p>
                  <p className="text-white font-medium mt-1">
                    {insights.favoriteLocation.location}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Visited {insights.favoriteLocation.count} times
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Busiest Day */}
        {insights.busiestDay && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <Clock className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Busiest day</p>
                  <p className="text-white font-medium mt-1">
                    {insights.busiestDay}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Friends to Reconnect */}
      {insights.friendsToReconnect.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Time to Reconnect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.friendsToReconnect.map((friend) => (
                <div
                  key={friend.friendId}
                  className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.friendAvatar} />
                      <AvatarFallback>
                        {friend.friendName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        {friend.friendName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {friend.daysSince === null
                          ? 'Never hung out'
                          : `Last hangout: ${friend.daysSince} days ago`}
                      </p>
                    </div>
                  </div>
                  <Link href={`/create?with=${friend.friendId}`}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Plan Hangout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

