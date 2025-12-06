'use client'

import { useState, useEffect } from 'react'
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

  const fetchFeed = async (pageNum: number = 1, append: boolean = false) => {
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
  }

  useEffect(() => {
    if (!isLoaded) return
    setLoading(true)
    setPage(1)
    fetchFeed(1, false)
  }, [showPast, isLoaded])

  const loadMore = async () => {
    if (loading || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    setLoading(true)
    await fetchFeed(nextPage, true)
  }

  if (loading) {
    return (
      <div className="space-y-3 px-4 pb-24">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-planner-border/50 animate-pulse">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-planner-tab rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-planner-tab rounded w-3/4" />
                <div className="h-4 bg-planner-tab rounded w-1/2" />
                <div className="h-4 bg-planner-tab rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 bg-planner-tab rounded-full flex items-center justify-center mb-4 shadow-inner">
          <Calendar className="w-8 h-8 text-planner-text-muted opacity-50" />
        </div>
        <h3 className="text-xl font-bold text-planner-navy mb-2">
          {showPast ? 'No past events' : 'No upcoming plans'}
        </h3>
        <p className="text-planner-text-secondary max-w-xs mx-auto">
          {showPast 
            ? 'You haven\'t attended any events yet. Start planning to create memories!'
            : 'Your schedule is clear. Create a plan or discover events to get started.'
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
