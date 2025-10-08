"use client"

import { Navigation } from "@/components/navigation"
import { HangoutCalendar } from "@/components/hangout-calendar"
import { StackedHangoutTile } from "@/components/stacked-hangout-tile"
import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getHangoutActionStatus } from "@/hooks/use-hangout-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSwipeGestures } from "@/hooks/use-swipe-gestures"
import { useRouter } from "next/navigation"

interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator: {
    name: string
    username: string
    avatar?: string
  }
  participants?: Array<{
    id: string
    user: {
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: "YES" | "NO" | "MAYBE" | "PENDING"
  }>
  _count?: {
    participants: number
  }
  privacyLevel?: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE"
  maxParticipants?: number
  image?: string
  photos?: string[]
  // Activity tracking
  lastActivity?: string
  hasRecentActivity?: boolean
  activityType?: 'comment' | 'photo' | 'rsvp' | 'poll'
  activityCount?: number
  // Voting status
  votingStatus?: 'open' | 'closed' | 'pending'
  // RSVP status for current user
  myRsvpStatus?: "YES" | "NO" | "MAYBE" | "PENDING"
  // Creation time
  createdAt?: string
}

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth()
  const router = useRouter()
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent-activity' | 'coming-up'>('recent-activity')
  const [isClient, setIsClient] = useState(false)

  // Swipe gestures for mobile navigation
  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => router.push('/discover'),
    onSwipeRight: () => router.push('/profile'),
    threshold: 100
  })


  // Calculate action status for all hangouts at the top level
  const hangoutActions = useMemo(() => {
    return hangouts.map(hangout => ({
      hangout,
      actions: getHangoutActionStatus(hangout)
    }))
  }, [hangouts])

  // Sort hangouts based on selected sort option
  const sortedHangouts = useMemo(() => {
    if (!hangouts.length) return []
    
    // const now = new Date()
    const sorted = [...hangoutActions].sort((a, b) => {
      const aActions = a.actions
      const bActions = b.actions
      
      // Priority 1: Pending actions (high priority first)
      if (aActions.actionPriority !== 'none' && bActions.actionPriority === 'none') return -1
      if (aActions.actionPriority === 'none' && bActions.actionPriority !== 'none') return 1
      
      // If both have actions, sort by priority level
      if (aActions.actionPriority !== 'none' && bActions.actionPriority !== 'none') {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
        const aPriority = priorityOrder[aActions.actionPriority] || 0
        const bPriority = priorityOrder[bActions.actionPriority] || 0
        if (aPriority !== bPriority) return bPriority - aPriority
      }
      
      if (sortBy === 'coming-up') {
        // Sort by start time (upcoming first)
        const aTime = new Date(a.hangout.startTime).getTime()
        const bTime = new Date(b.hangout.startTime).getTime()
        return aTime - bTime
      } else {
        // Sort by recent activity - prioritize by creation time and activity
        const aCreatedTime = new Date(a.hangout.createdAt || a.hangout.startTime).getTime()
        const bCreatedTime = new Date(b.hangout.createdAt || b.hangout.startTime).getTime()
        
        // First, check if either has recent activity (within last 24 hours)
        const aHasRecentActivity = a.hangout.hasRecentActivity || false
        const bHasRecentActivity = b.hangout.hasRecentActivity || false
        
        // If both have recent activity, sort by last activity time
        if (aHasRecentActivity && bHasRecentActivity) {
          const aActivityTime = a.hangout.lastActivity ? new Date(a.hangout.lastActivity).getTime() : aCreatedTime
          const bActivityTime = b.hangout.lastActivity ? new Date(b.hangout.lastActivity).getTime() : bCreatedTime
          return bActivityTime - aActivityTime
        }
        
        // If only one has recent activity, prioritize it
        if (aHasRecentActivity && !bHasRecentActivity) return -1
        if (!aHasRecentActivity && bHasRecentActivity) return 1
        
        // If neither has recent activity, sort by creation time (most recent first)
        return bCreatedTime - aCreatedTime
      }
    })
    
    return sorted.map(item => item.hangout)
  }, [hangoutActions, sortBy])

  useEffect(() => {
    setIsClient(true)
    
    const fetchHangouts = async () => {
      // Don't fetch if auth is still loading
      if (authLoading) {
        setLoading(true)
        return
      }

      try {
        setLoading(true)
        // Fetch user's personal feed (created + invited hangouts)
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch('/api/feed-simple?type=home&contentType=hangouts', {
          headers
        })
        const data = await response.json()
        
        
        if (data.success) {
          const hangoutsData = data.data.content || []
          setHangouts(hangoutsData)
          setError(null)
        } else {
          throw new Error(data.error || 'Failed to fetch hangouts')
        }
      } catch (err) {
        console.error('Error fetching hangouts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch hangouts')
        setHangouts([])
      } finally {
        setLoading(false)
      }
    }

    fetchHangouts()
  }, [authLoading])
  

  // Show hangouts even when not authenticated (public hangouts)
  // Only show sign-in prompt if there are no hangouts to display

  return (
    <div 
      {...swipeGestures}
      className="min-h-screen"
    >
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-8">
          <HangoutCalendar hangouts={hangouts} events={[]} />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Hangouts ({hangouts.length})</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              {isClient ? (
                <Select value={sortBy} onValueChange={(value: 'recent-activity' | 'coming-up') => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select sort option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent-activity">Most Recent Activity</SelectItem>
                    <SelectItem value="coming-up">Coming Up</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-48 h-9 bg-gray-100 rounded-md animate-pulse" />
              )}
            </div>
          </div>
          
          {loading && (
            <div className="p-4 text-center">Loading hangouts...</div>
          )}
          
          {error && (
            <div className="p-4 text-red-600 bg-red-50 rounded-lg">
              Error: {error}
            </div>
          )}
          
          {!loading && !error && hangouts.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Welcome to Hangouts 3.0</h2>
              <p className="text-gray-600 mb-6">
                {!isAuthenticated 
                  ? "Please sign in to view your hangouts and create new ones." 
                  : "No hangouts found. Create your first hangout!"
                }
              </p>
              {!isAuthenticated && (
                <div className="space-x-4">
                  <a href="/login" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                    Sign In
                  </a>
                  <a href="/signup" className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50">
                    Sign Up
                  </a>
                </div>
              )}
            </div>
          )}
          
          {!loading && !error && sortedHangouts.length > 0 && (
            <div className="space-y-0">
              {sortedHangouts.map((hangout, index) => (
                <StackedHangoutTile 
                  key={hangout.id} 
                  hangout={hangout} 
                  index={index}
                  totalCount={sortedHangouts.length}
                  showActivityIndicator={!!hangout.hasRecentActivity}
                  activityType={hangout.activityType || 'comment'}
                  activityCount={hangout.activityCount || 0}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}