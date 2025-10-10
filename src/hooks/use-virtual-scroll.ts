"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
  threshold?: number
}

interface VirtualScrollResult<T> {
  items: T[]
  containerRef: React.RefObject<HTMLDivElement>
  scrollElementRef: React.RefObject<HTMLDivElement>
  totalHeight: number
  offsetY: number
  visibleRange: { start: number; end: number }
  scrollToIndex: (index: number) => void
  scrollToTop: () => void
  scrollToBottom: () => void
}

export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  threshold = 100
}: VirtualScrollOptions & { items: T[] }): VirtualScrollResult<T> {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2)

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, startIndex, endIndex])

  const offsetY = startIndex * itemHeight

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
  }, [])

  useEffect(() => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement) return

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollToIndex = useCallback((index: number) => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement) return

    const targetScrollTop = index * itemHeight
    scrollElement.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }, [itemHeight])

  const scrollToTop = useCallback(() => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement) return

    scrollElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  const scrollToBottom = useCallback(() => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement) return

    scrollElement.scrollTo({
      top: totalHeight,
      behavior: 'smooth'
    })
  }, [totalHeight])

  return {
    items: visibleItems,
    containerRef,
    scrollElementRef,
    totalHeight,
    offsetY,
    visibleRange: { start: startIndex, end: endIndex },
    scrollToIndex,
    scrollToTop,
    scrollToBottom
  }
}

// Infinite scroll hook
export function useInfiniteScroll<T>({
  fetchMore,
  hasMore,
  threshold = 100
}: {
  fetchMore: () => Promise<void>
  hasMore: boolean
  threshold?: number
}) {
  const [isLoading, setIsLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      await fetchMore()
    } catch (error) {
      console.error('Error loading more items:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, fetchMore])

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current
    if (!loadMoreElement || !hasMore) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreElement)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoading, loadMore])

  return {
    loadMoreRef,
    isLoading,
    loadMore
  }
}

