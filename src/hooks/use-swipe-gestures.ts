"use client"

import { useState, useRef, useCallback, useEffect } from 'react'

interface SwipeGestureOptions {
  threshold?: number // Minimum distance to trigger swipe
  velocity?: number // Minimum velocity to trigger swipe
  direction?: 'horizontal' | 'vertical' | 'both'
  preventDefault?: boolean
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
}

interface SwipeState {
  isSwipeActive: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  velocity: number
  direction: 'left' | 'right' | 'up' | 'down' | null
}

export function useSwipeGestures(options: SwipeGestureOptions = {}) {
  const {
    threshold = 50,
    velocity = 0.3,
    direction = 'both',
    preventDefault = true,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd
  } = options

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwipeActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null
  })

  const elementRef = useRef<HTMLElement>(null)
  const startTimeRef = useRef<number>(0)
  const lastMoveTimeRef = useRef<number>(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const now = Date.now()

    setSwipeState({
      isSwipeActive: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null
    })

    startTimeRef.current = now
    lastMoveTimeRef.current = now
    onSwipeStart?.()
  }, [onSwipeStart])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!swipeState.isSwipeActive || e.touches.length !== 1) return

    const touch = e.touches[0]
    const now = Date.now()
    const deltaTime = now - lastMoveTimeRef.current

    if (deltaTime < 16) return // Throttle to ~60fps

    const deltaX = touch.clientX - swipeState.startX
    const deltaY = touch.clientY - swipeState.startY
    const currentVelocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / (now - startTimeRef.current)

    let newDirection: 'left' | 'right' | 'up' | 'down' | null = null

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        newDirection = deltaX > 0 ? 'right' : 'left'
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        newDirection = deltaY > 0 ? 'down' : 'up'
      }
    }

    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      velocity: currentVelocity,
      direction: newDirection
    }))

    lastMoveTimeRef.current = now

    if (preventDefault) {
      e.preventDefault()
    }
  }, [swipeState.isSwipeActive, swipeState.startX, swipeState.startY, threshold, preventDefault])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!swipeState.isSwipeActive) return

    const { deltaX, deltaY, velocity: currentVelocity, direction: currentDirection } = swipeState
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Check if swipe meets threshold and velocity requirements
    if (totalDistance >= threshold && currentVelocity >= velocity) {
      switch (currentDirection) {
        case 'left':
          if (direction === 'horizontal' || direction === 'both') {
            onSwipeLeft?.()
          }
          break
        case 'right':
          if (direction === 'horizontal' || direction === 'both') {
            onSwipeRight?.()
          }
          break
        case 'up':
          if (direction === 'vertical' || direction === 'both') {
            onSwipeUp?.()
          }
          break
        case 'down':
          if (direction === 'vertical' || direction === 'both') {
            onSwipeDown?.()
          }
          break
      }
    }

    setSwipeState({
      isSwipeActive: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null
    })

    onSwipeEnd?.()
  }, [swipeState, threshold, velocity, direction, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd])

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
    swipeState,
    isSwipeActive: swipeState.isSwipeActive,
    deltaX: swipeState.deltaX,
    deltaY: swipeState.deltaY,
    direction: swipeState.direction
  }
}

// Swipe actions hook for cards
export function useSwipeActions<T>(items: T[], onDelete?: (item: T) => void, onArchive?: (item: T) => void) {
  const [swipedItem, setSwipedItem] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handleSwipeLeft = useCallback((itemId: string) => {
    setSwipedItem(itemId)
    setSwipeOffset(-100)
  }, [])

  const handleSwipeRight = useCallback((itemId: string) => {
    setSwipedItem(itemId)
    setSwipeOffset(100)
  }, [])

  const resetSwipe = useCallback(() => {
    setSwipedItem(null)
    setSwipeOffset(0)
  }, [])

  const handleAction = useCallback((action: 'delete' | 'archive', item: T) => {
    if (action === 'delete') {
      onDelete?.(item)
    } else if (action === 'archive') {
      onArchive?.(item)
    }
    resetSwipe()
  }, [onDelete, onArchive, resetSwipe])

  return {
    swipedItem,
    swipeOffset,
    handleSwipeLeft,
    handleSwipeRight,
    resetSwipe,
    handleAction
  }
}

