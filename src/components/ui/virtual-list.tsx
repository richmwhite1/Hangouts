"use client"

import React, { forwardRef } from 'react'
import { useVirtualScroll } from '@/hooks/use-virtual-scroll'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll
}: VirtualListProps<T>) {
  const {
    items: visibleItems,
    scrollElementRef,
    totalHeight,
    offsetY,
    scrollToIndex,
    scrollToTop,
    scrollToBottom
  } = useVirtualScroll({
    items,
    itemHeight,
    containerHeight,
    overscan
  })

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    onScroll?.(scrollTop)
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Infinite scroll list component
interface InfiniteScrollListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  loadingComponent?: React.ReactNode
  endComponent?: React.ReactNode
}

export function InfiniteScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  hasMore,
  isLoading,
  onLoadMore,
  loadingComponent,
  endComponent
}: InfiniteScrollListProps<T>) {
  const {
    items: visibleItems,
    scrollElementRef,
    totalHeight,
    offsetY
  } = useVirtualScroll({
    items,
    itemHeight,
    containerHeight,
    overscan: 5
  })

  const { loadMoreRef } = useInfiniteScroll({
    fetchMore: onLoadMore,
    hasMore,
    threshold: 100
  })

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
        
        {/* Load more trigger */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            style={{
              height: 100,
              position: 'absolute',
              top: totalHeight - 100,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading && (loadingComponent || (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span>Loading more...</span>
              </div>
            ))}
          </div>
        )}
        
        {/* End of list */}
        {!hasMore && items.length > 0 && (endComponent || (
          <div
            style={{
              height: 50,
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280'
            }}
          >
            No more items
          </div>
        ))}
      </div>
    </div>
  )
}

