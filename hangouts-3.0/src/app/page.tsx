"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users } from "lucide-react"
import { GuestLanding } from "@/components/guest-landing"
import { ViewToggle } from "@/components/planner/view-toggle"
import { TodayView } from "@/components/planner/today-view"
import { MonthCalendarView } from "@/components/planner/month-calendar-view"
import { QuickPlanModal } from "@/components/create/QuickPlanModal"
import { UserStatusWidget } from "@/components/home/UserStatusWidget"
import { FeedToggle } from "@/components/home/feed-toggle"
import { HomeFeedList } from "@/components/home/home-feed-list"
import { Zap } from "lucide-react"

// Re-using the interface (should be shared)
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
  image?: string
  photos?: string[]
  votingStatus?: 'open' | 'closed' | 'pending'
  myRsvpStatus?: "YES" | "NO" | "MAYBE" | "PENDING"
}

export default function HomePage() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const router = useRouter()
  const [hangouts, setHangouts] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [view, setView] = useState<'today' | 'month'>('today')
  const [isQuickPlanOpen, setIsQuickPlanOpen] = useState(false)
  const [feedView, setFeedView] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchHangouts() {
      if (!isLoaded) return

      try {
        setLoading(true)
        const token = await getToken()

        // Fetch from unified feed API for both hangouts and events
        const response = await fetch('/api/feed?type=home&contentType=all&limit=100', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch feed')
        }

        const data = await response.json()
        setHangouts(data.data?.content || [])
      } catch (err) {
        console.error('Error fetching feed:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isSignedIn) {
      fetchHangouts()
    } else {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, getToken])

  if (!isLoaded || !isClient) {
    return null
  }

  if (!isSignedIn) {
    return <GuestLanding onSignIn={() => router.push('/sign-in')} onSignUp={() => router.push('/sign-up')} />
  }

  return (
    <div className="min-h-screen bg-planner-cream pb-20">
      {/* Header - Minimal & Clean */}
      <div className="sticky top-0 z-20 bg-planner-cream/95 backdrop-blur-md border-b border-planner-border/50 pt-safe">
        <div className="px-4 py-3 relative flex items-center justify-center">
          <ViewToggle value={view} onChange={setView} />
          <Link href="/friends" className="absolute right-4 p-2 text-planner-navy hover:bg-black/5 rounded-full transition-colors">
            <Users className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-2">
        <div className="px-4">
          <UserStatusWidget />
        </div>
        <div className="px-4">
          {view === 'today' ? (
            <TodayView items={Array.isArray(hangouts) ? hangouts : []} loading={loading} />
          ) : (
            <MonthCalendarView items={Array.isArray(hangouts) ? hangouts : []} loading={loading} />
          )}
        </div>
        
        {/* Feed Toggle and List */}
        <div className="mt-6 border-t border-planner-border/30">
          <FeedToggle value={feedView} onChange={setFeedView} />
          <HomeFeedList showPast={feedView === 'past'} />
        </div>
      </div>

      {/* Quick Plan FAB */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setIsQuickPlanOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        >
          <Zap className="w-7 h-7 fill-white" />
        </button>
      </div>

      <QuickPlanModal
        isOpen={isQuickPlanOpen}
        onClose={() => setIsQuickPlanOpen(false)}
      />
    </div>
  )
}