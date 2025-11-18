"use client"
// Navigation is now handled by the root layout
import { HangoutCalendar } from "@/components/hangout-calendar"
import { StackedHangoutTile } from "@/components/stacked-hangout-tile"
import { GuestLanding } from "@/components/guest-landing"
import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { getHangoutActionStatus } from "@/hooks/use-hangout-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSwipeGestures } from "@/hooks/use-swipe-gestures"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { isPastDate } from "@/lib/date-utils"
import { Filter, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface FeedItem {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  type?: 'HANGOUT' | 'EVENT' | string
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
  const { isSignedIn, isLoaded, getToken, userId } = useAuth()
  const router = useRouter()
  const [hangouts, setHangouts] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent-activity' | 'coming-up'>('recent-activity')
  const [isClient, setIsClient] = useState(false)
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'hangouts' | 'events'>('all')
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)
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
        // Handle invalid dates
        if (isNaN(aTime) && isNaN(bTime)) return 0
        if (isNaN(aTime)) return 1
        if (isNaN(bTime)) return -1
        return aTime - bTime
      } else {
        // Sort by recent activity - prioritize by creation time and activity
        const aCreatedTime = new Date(a.hangout.createdAt || a.hangout.startTime).getTime()
        const bCreatedTime = new Date(b.hangout.createdAt || b.hangout.startTime).getTime()
        // Handle invalid dates
        if (isNaN(aCreatedTime) && isNaN(bCreatedTime)) return 0
        if (isNaN(aCreatedTime)) return 1
        if (isNaN(bCreatedTime)) return -1
        // First, check if either has recent activity (within last 24 hours)
        const aHasRecentActivity = a.hangout.hasRecentActivity || false
        const bHasRecentActivity = b.hangout.hasRecentActivity || false
        // If both have recent activity, sort by last activity time
        if (aHasRecentActivity && bHasRecentActivity) {
          const aActivityTime = a.hangout.lastActivity ? new Date(a.hangout.lastActivity).getTime() : aCreatedTime
          const bActivityTime = b.hangout.lastActivity ? new Date(b.hangout.lastActivity).getTime() : bCreatedTime
          // Handle invalid activity dates
          if (isNaN(aActivityTime) && isNaN(bActivityTime)) return 0
          if (isNaN(aActivityTime)) return 1
          if (isNaN(bActivityTime)) return -1
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

  const filteredHangouts = useMemo(() => {
    const startFilter = dateFilter.start ? new Date(dateFilter.start) : null
    const endFilter = dateFilter.end ? new Date(dateFilter.end) : null

    return sortedHangouts.filter(item => {
      if (contentTypeFilter === 'hangouts' && item.type === 'EVENT') return false
      if (contentTypeFilter === 'events' && item.type !== 'EVENT') return false

      if ((startFilter || endFilter) && item.startTime) {
        const itemDate = new Date(item.startTime)
        if (startFilter && !isNaN(startFilter.getTime()) && itemDate < startFilter) return false
        if (endFilter && !isNaN(endFilter.getTime()) && itemDate > endFilter) return false
      }

      return true
    })
  }, [sortedHangouts, contentTypeFilter, dateFilter.start, dateFilter.end])

  const { upcomingHangouts, pastHangouts, events, hangoutsOnly } = useMemo(() => {
    const upcoming: FeedItem[] = []
    const past: FeedItem[] = []
    const eventsList: FeedItem[] = []
    const hangoutsList: FeedItem[] = []
    
    filteredHangouts.forEach(item => {
      const referenceDate = item.endTime || item.startTime
      if (isPastDate(referenceDate)) {
        past.push(item)
      } else {
        upcoming.push(item)
      }
      
      // Separate events from hangouts for calendar
      if (item.type === 'EVENT') {
        eventsList.push(item)
      } else {
        hangoutsList.push(item)
      }
    })
    return { 
      upcomingHangouts: upcoming, 
      pastHangouts: past,
      events: eventsList,
      hangoutsOnly: hangoutsList
    }
  }, [filteredHangouts])
  const totalVisible = upcomingHangouts.length + pastHangouts.length
  useEffect(() => {
    setIsClient(true)
    const fetchHangouts = async () => {
      // Don't fetch if auth is still loading
      if (!isLoaded) {
        setLoading(true)
        return
      }
      
      // Don't fetch if user is not signed in
      if (!isSignedIn) {
        setLoading(false)
        setHangouts([])
        return
      }
      
      try {
        setLoading(true)
        // Fetch user's personal feed (created + invited hangouts)
        const token = await getToken()
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
        
        const params = new URLSearchParams({
          type: 'home',
          contentType: contentTypeFilter
        })
        params.append('includePast', 'true')
        if (dateFilter.start) {
          const startDate = new Date(dateFilter.start)
          if (!isNaN(startDate.getTime())) {
            params.append('startDate', startDate.toISOString())
          }
        }
        if (dateFilter.end) {
          const endDate = new Date(dateFilter.end)
          if (!isNaN(endDate.getTime())) {
            params.append('endDate', endDate.toISOString())
          }
        }

        const response = await fetch(`/api/feed-simple?${params.toString()}`, {
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
        console.error('❌ Error fetching hangouts:', err);
        logger.error('Error fetching hangouts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch hangouts')
        setHangouts([])
      } finally {
        setLoading(false)
      }
    }
    fetchHangouts()
  }, [isLoaded, isSignedIn, contentTypeFilter, dateFilter.start, dateFilter.end])
  // Show guest landing for non-authenticated users
  if (!isSignedIn) {
    return (
      <GuestLanding
        onSignIn={() => {
          window.location.href = '/signin'
        }}
        onSignUp={() => {
          window.location.href = '/signup'
        }}
      />
    )
  }
  return (
    <div
      {...swipeGestures}
      className="min-h-screen pb-20"
    >
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-8">
          <HangoutCalendar 
            hangouts={hangoutsOnly as any} 
            events={events as any} 
            currentUserId={userId || ''} 
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-white">Hangouts ({totalVisible})</h2>
            <div className="flex items-center gap-1.5">
              {isClient ? (
                <>
                  <Select value={contentTypeFilter} onValueChange={(value: 'all' | 'hangouts' | 'events') => setContentTypeFilter(value)}>
                    <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs border-gray-700 bg-transparent text-gray-400 hover:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="hangouts">Hangouts</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                    </SelectContent>
                  </Select>
                  <Popover open={showFilters} onOpenChange={setShowFilters}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-gray-400 hover:text-white relative"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        {(dateFilter.start || dateFilter.end) && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 bg-gray-900 border-gray-700" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Date Range</span>
                          {(dateFilter.start || dateFilter.end) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-gray-500 hover:text-white"
                              onClick={() => {
                                setDateFilter({ start: '', end: '' })
                                setShowFilters(false)
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">From</label>
                            <Input
                              type="date"
                              value={dateFilter.start}
                              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                              className="h-8 text-xs bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">To</label>
                            <Input
                              type="date"
                              value={dateFilter.end}
                              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                              className="h-8 text-xs bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Select value={sortBy} onValueChange={(value: 'recent-activity' | 'coming-up') => setSortBy(value)}>
                    <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs border-gray-700 bg-transparent text-gray-400 hover:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent-activity">Recent</SelectItem>
                      <SelectItem value="coming-up">Coming Up</SelectItem>
                    </SelectContent>
                  </Select>
                </>
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
          {!loading && !error && totalVisible === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Welcome to Hangouts 3.0</h2>
              <p className="text-gray-600 mb-6">
                No hangouts found. Create your first hangout!
              </p>
            </div>
          )}
          {!loading && !error && totalVisible > 0 && (
            <div className="space-y-0">
              {upcomingHangouts.map((hangout, index) => (
                <StackedHangoutTile
                  key={`${hangout.id}-upcoming`}
                  hangout={hangout as any}
                  index={index}
                  totalCount={totalVisible}
                  showActivityIndicator={!!hangout.hasRecentActivity}
                  activityType={hangout.activityType || 'comment'}
                  activityCount={hangout.activityCount || 0}
                />
              ))}
              {pastHangouts.length > 0 && (
                <div className="py-4 text-center text-xs uppercase tracking-wide text-gray-500">
                  Past events and hangouts
                </div>
              )}
              {pastHangouts.map((hangout, index) => (
                <StackedHangoutTile
                  key={`${hangout.id}-past`}
                  hangout={hangout as any}
                  index={upcomingHangouts.length + index}
                  totalCount={totalVisible}
                  showActivityIndicator={!!hangout.hasRecentActivity}
                  activityType={hangout.activityType || 'comment'}
                  activityCount={hangout.activityCount || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}