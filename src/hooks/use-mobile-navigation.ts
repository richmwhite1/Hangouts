"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface MobileNavigationOptions {
  enableSwipeBack?: boolean
  enableSwipeForward?: boolean
  enableSwipeUp?: boolean
  enableSwipeDown?: boolean
  swipeThreshold?: number
  onSwipeBack?: () => void
  onSwipeForward?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useMobileNavigation(options: MobileNavigationOptions = {}) {
  const {
    enableSwipeBack = true,
    enableSwipeForward = false,
    enableSwipeUp = false,
    enableSwipeDown = false,
    swipeThreshold = 100,
    onSwipeBack,
    onSwipeForward,
    onSwipeUp,
    onSwipeDown
  } = options

  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleSwipeBack = useCallback(() => {
    if (isNavigating) return
    
    setIsNavigating(true)
    onSwipeBack?.() || router.back()
    
    setTimeout(() => setIsNavigating(false), 300)
  }, [isNavigating, onSwipeBack, router])

  const handleSwipeForward = useCallback(() => {
    if (isNavigating) return
    
    setIsNavigating(true)
    onSwipeForward?.() || router.forward()
    
    setTimeout(() => setIsNavigating(false), 300)
  }, [isNavigating, onSwipeForward, router])

  const handleSwipeUp = useCallback(() => {
    if (isNavigating) return
    
    setIsNavigating(true)
    onSwipeUp?.()
    
    setTimeout(() => setIsNavigating(false), 300)
  }, [isNavigating, onSwipeUp])

  const handleSwipeDown = useCallback(() => {
    if (isNavigating) return
    
    setIsNavigating(true)
    onSwipeDown?.()
    
    setTimeout(() => setIsNavigating(false), 300)
  }, [isNavigating, onSwipeDown])

  // Detect swipe gestures
  useEffect(() => {
    let startX = 0
    let startY = 0
    let startTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      startTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return
      
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      const deltaTime = Date.now() - startTime
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime

      // Check if swipe meets threshold and velocity requirements
      if (velocity > 0.3) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > swipeThreshold && enableSwipeBack) {
            handleSwipeBack()
          } else if (deltaX < -swipeThreshold && enableSwipeForward) {
            handleSwipeForward()
          }
        } else {
          // Vertical swipe
          if (deltaY < -swipeThreshold && enableSwipeUp) {
            handleSwipeUp()
          } else if (deltaY > swipeThreshold && enableSwipeDown) {
            handleSwipeDown()
          }
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [swipeThreshold, enableSwipeBack, enableSwipeForward, enableSwipeUp, enableSwipeDown, handleSwipeBack, handleSwipeForward, handleSwipeUp, handleSwipeDown])

  return {
    isNavigating,
    handleSwipeBack,
    handleSwipeForward,
    handleSwipeUp,
    handleSwipeDown
  }
}

// Mobile navigation context
interface MobileNavigationContextType {
  isNavigating: boolean
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
  goTo: (path: string) => void
}

export function useMobileNavigationContext(): MobileNavigationContextType {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    // Check if we can go back/forward
    setCanGoBack(window.history.length > 1)
    setCanGoForward(false) // This is hard to detect reliably
  }, [])

  const goBack = useCallback(() => {
    router.back()
  }, [router])

  const goForward = useCallback(() => {
    router.forward()
  }, [router])

  const goTo = useCallback((path: string) => {
    router.push(path)
  }, [router])

  return {
    isNavigating: false,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goTo
  }
}

// Mobile navigation bar component
interface MobileNavigationBarProps {
  title: string
  showBackButton?: boolean
  showForwardButton?: boolean
  onBack?: () => void
  onForward?: () => void
  className?: string
}

export function MobileNavigationBar({
  title,
  showBackButton = true,
  showForwardButton = false,
  onBack,
  onForward,
  className = ''
}: MobileNavigationBarProps) {
  const { canGoBack, canGoForward, goBack, goForward } = useMobileNavigationContext()

  const handleBack = () => {
    onBack?.() || goBack()
  }

  const handleForward = () => {
    onForward?.() || goForward()
  }

  return (
    <div className={`flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center space-x-2">
        {showBackButton && (
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {showForwardButton && (
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
        {title}
      </h1>
      
      <div className="w-16" /> {/* Spacer for centering */}
    </div>
  )
}

