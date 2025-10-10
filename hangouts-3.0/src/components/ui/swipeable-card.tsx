"use client"

import React, { useState } from 'react'
import { useSwipeGestures, useSwipeActions } from '@/hooks/use-swipe-gestures'
import { cn } from '@/lib/utils'
import { Trash2, Archive, X } from 'lucide-react'

interface SwipeableCardProps {
  children: React.ReactNode
  onDelete?: () => void
  onArchive?: () => void
  className?: string
  disabled?: boolean
  swipeThreshold?: number
}

export function SwipeableCard({
  children,
  onDelete,
  onArchive,
  className,
  disabled = false,
  swipeThreshold = 100
}: SwipeableCardProps) {
  const [isSwipeActive, setIsSwipeActive] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const { elementRef, deltaX, isSwipeActive: gestureActive } = useSwipeGestures({
    threshold: 20,
    direction: 'horizontal',
    onSwipeLeft: () => {
      if (!disabled) {
        setIsSwipeActive(true)
        setSwipeOffset(-swipeThreshold)
      }
    },
    onSwipeRight: () => {
      if (!disabled) {
        setIsSwipeActive(true)
        setSwipeOffset(swipeThreshold)
      }
    },
    onSwipeStart: () => {
      if (!disabled) {
        setIsSwipeActive(true)
      }
    },
    onSwipeEnd: () => {
      if (!disabled) {
        // Reset if not swiped far enough
        if (Math.abs(deltaX) < swipeThreshold) {
          setSwipeOffset(0)
        }
      }
    }
  })

  const handleReset = () => {
    setIsSwipeActive(false)
    setSwipeOffset(0)
  }

  const handleAction = (action: 'delete' | 'archive') => {
    if (action === 'delete') {
      onDelete?.()
    } else if (action === 'archive') {
      onArchive?.()
    }
    handleReset()
  }

  return (
    <div className="relative overflow-hidden">
      {/* Main Card */}
      <div
        ref={elementRef}
        className={cn(
          "relative transition-transform duration-200 ease-out",
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          zIndex: 2
        }}
      >
        {children}
      </div>

      {/* Swipe Actions Background */}
      <div className="absolute inset-0 flex items-center justify-between px-4 bg-gray-100 dark:bg-gray-800">
        {/* Left Actions (Swipe Right) */}
        <div className="flex items-center space-x-2">
          {onArchive && (
            <button
              onClick={() => handleAction('archive')}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Actions (Swipe Left) */}
        <div className="flex items-center space-x-2">
          {onDelete && (
            <button
              onClick={() => handleAction('delete')}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Reset Button */}
      {isSwipeActive && (
        <button
          onClick={handleReset}
          className="absolute top-2 right-2 z-10 p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// Swipeable List Item Component
interface SwipeableListItemProps {
  id: string
  children: React.ReactNode
  onDelete?: (id: string) => void
  onArchive?: (id: string) => void
  className?: string
  disabled?: boolean
}

export function SwipeableListItem({
  id,
  children,
  onDelete,
  onArchive,
  className,
  disabled = false
}: SwipeableListItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwipeActive, setIsSwipeActive] = useState(false)

  const { elementRef, deltaX } = useSwipeGestures({
    threshold: 50,
    direction: 'horizontal',
    onSwipeLeft: () => {
      if (!disabled) {
        setSwipeOffset(-120)
        setIsSwipeActive(true)
      }
    },
    onSwipeRight: () => {
      if (!disabled) {
        setSwipeOffset(120)
        setIsSwipeActive(true)
      }
    },
    onSwipeStart: () => {
      if (!disabled) {
        setIsSwipeActive(true)
      }
    },
    onSwipeEnd: () => {
      if (!disabled && Math.abs(deltaX) < 50) {
        setSwipeOffset(0)
        setIsSwipeActive(false)
      }
    }
  })

  const handleReset = () => {
    setSwipeOffset(0)
    setIsSwipeActive(false)
  }

  const handleAction = (action: 'delete' | 'archive') => {
    if (action === 'delete') {
      onDelete?.(id)
    } else if (action === 'archive') {
      onArchive?.(id)
    }
    handleReset()
  }

  return (
    <div className="relative overflow-hidden">
      {/* Main Content */}
      <div
        ref={elementRef}
        className={cn(
          "relative transition-transform duration-200 ease-out",
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          zIndex: 2
        }}
      >
        {children}
      </div>

      {/* Swipe Actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4 bg-gray-100 dark:bg-gray-800">
        {/* Left Actions */}
        <div className="flex items-center space-x-2">
          {onArchive && (
            <button
              onClick={() => handleAction('archive')}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {onDelete && (
            <button
              onClick={() => handleAction('delete')}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Reset Button */}
      {isSwipeActive && (
        <button
          onClick={handleReset}
          className="absolute top-2 right-2 z-10 p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

