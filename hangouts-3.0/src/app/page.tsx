"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { ActionFeed } from "@/components/home/action-feed"
import { GuestLanding } from "@/components/guest-landing"
import { useSwipeGestures } from "@/hooks/use-swipe-gestures"

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

  // Swipe gestures for mobile navigation
  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => router.push('/discover'),
    onSwipeRight: () => router.push('/profile'),
    threshold: 100
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchHangouts() {
      if (!isLoaded) return

      try {
        setLoading(true)
        const token = await getToken()

        // Fetch all hangouts - backend handles basic filtering
        const response = await fetch('/api/hangouts', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch hangouts')
        }

        const data = await response.json()
        setHangouts(data)
      } catch (err) {
        console.error('Error fetching hangouts:', err)
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
    <div className="min-h-screen pb-20" {...swipeGestures}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2 px-4">
        <h1 className="text-2xl font-bold text-white">My Plans</h1>
        {/* Profile/Settings button could go here */}
      </div>

      {/* Main Feed */}
      <div className="px-4">
        <ActionFeed items={hangouts} loading={loading} />
      </div>
    </div>
  )
}