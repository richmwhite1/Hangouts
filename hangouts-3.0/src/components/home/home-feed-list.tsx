'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { FeedItemCard } from './feed-item-card'
import { Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HomeFeedListProps {
  showPast: boolean
}

export function HomeFeedList({ showPast }: HomeFeedListProps) {
  const { getToken, isLoaded } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchFeed = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!isLoaded) return
    
    try {
      const token = await getToken()
      if (!token) {
        setLoading(false)
        return
      }
      
      const params = new URLSearchParams({
        type: 'home',
        page: String(pageNum),
        limit: '20',
        includePast: showPast ? 'true' : 'false',
        sortBy: 'recent_activity'
      })

      const response = await fetch(`/api/feed?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch feed')
      }

      const data = await response.json()
      const newItems = data.data?.content || []

      if (append) {
        setItems(prev => [...prev, ...newItems])
      } else {
        setItems(newItems)
      }

      setHasMore(data.data?.pagination?.hasMore || false)
    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, getToken, showPast])

  useEffect(() => {
    if (!isLoaded) return
    setLoading(true)
    setPage(1)
    fetchFeed(1, false)
  }, [showPast, isLoaded, fetchFeed])

  // Refresh feed when page becomes visible (user navigates back)
  useEffect(() => {
    if (!isLoaded) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setPage(1)
        fetchFeed(1, false)
      }
    }

    const handleFocus = () => {
      setPage(1)
      fetchFeed(1, false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isLoaded, fetchFeed])

  const loadMore = async () => {
    if (loading || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    setLoading(true)
    await fetchFeed(nextPage, true)
  }

  if (loading) {
    return (
      <div className="px-4 pb-24 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="relative w-full h-72 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl overflow-hidden animate-pulse shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-400/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
              <div className="h-8 bg-white/30 rounded-lg w-3/4 backdrop-blur-sm" />
              <div className="flex gap-2">
                <div className="h-7 bg-white/30 rounded-full w-24 backdrop-blur-sm" />
                <div className="h-7 bg-white/30 rounded-full w-32 backdrop-blur-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
          <Calendar className="relative w-20 h-20 text-accent" strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-bold text-planner-text-primary mb-3">
          {showPast ? 'No Past Events Yet' : 'No Upcoming Plans'}
        </h3>
        <p className="text-planner-text-secondary max-w-sm text-lg leading-relaxed">
          {showPast 
            ? 'Your past hangouts and events will appear here once they\'re complete.' 
            : 'Create your first hangout or discover exciting events to get started!'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-24">
      {items.map((item, index) => (
        <FeedItemCard 
          key={`${item.type}-${item.id}-${index}`} 
          item={item}
          showUpdatedBadge={!showPast}
        />
      ))}
      
      {hasMore && items.length > 0 && (
        <div className="flex justify-center py-6">
          <Button
            onClick={loadMore}
            disabled={loading}
            className="bg-planner-navy hover:bg-planner-navy-light text-white px-8 py-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
      
      {!hasMore && items.length > 0 && (
        <div className="text-center py-6 text-planner-text-secondary text-sm">
          {showPast ? 'You\'ve reached the beginning' : 'You\'re all caught up!'}
        </div>
      )}
    </div>
  )
}
