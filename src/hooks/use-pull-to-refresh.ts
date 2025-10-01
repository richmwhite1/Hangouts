"use client"

import { useState, useRef, useCallback, useEffect } from 'react'

interface PullToRefreshOptions {
  threshold?: number // Distance to trigger refresh (default: 80px)
  resistance?: number // How much to resist the pull (default: 2.5)
  hapticEnabled?: boolean
  onRefresh: () => Promise<void> | void
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  canRefresh: boolean
}

export function usePullToRefresh({
  threshold = 80,
  resistance = 2.5,
  hapticEnabled = false,
  onRefresh
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false
  })

  const startY = useRef(0)
  const currentY = useRef(0)
  const elementRef = useRef<HTMLElement>(null)

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only trigger if at the top of the scrollable area
    if (elementRef.current && elementRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      currentY.current = e.touches[0].clientY
      setState(prev => ({ ...prev, isPulling: true }))
    }
  }, [])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling) return

    currentY.current = e.touches[0].clientY
    const pullDistance = Math.max(0, (currentY.current - startY.current) / resistance)
    
    setState(prev => ({
      ...prev,
      pullDistance,
      canRefresh: pullDistance >= threshold
    }))

    // Prevent default scrolling when pulling
    if (pullDistance > 0) {
      e.preventDefault()
    }
  }, [state.isPulling, resistance, threshold])

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return

    setState(prev => ({ ...prev, isPulling: false }))

    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true }))

      try {
        await onRefresh()
      } catch (error) {
        console.error('Pull to refresh error:', error)
      } finally {
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          pullDistance: 0, 
          canRefresh: false 
        }))
      }
    } else {
      // Reset if not enough pull distance
      setState(prev => ({ 
        ...prev, 
        pullDistance: 0, 
        canRefresh: false 
      }))
    }
  }, [state.isPulling, state.canRefresh, state.isRefreshing, onRefresh])

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    elementRef,
    isRefreshing: state.isRefreshing,
    pullDistance: state.pullDistance,
    canRefresh: state.canRefresh
  }
}
