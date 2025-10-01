"use client"

import React from 'react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  className?: string
  threshold?: number
  resistance?: number
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  resistance = 2.5
}: PullToRefreshProps) {
  const { elementRef, isRefreshing, pullDistance, canRefresh } = usePullToRefresh({
    threshold,
    resistance,
    onRefresh
  })

  return (
    <div className={`relative ${className}`}>
      {/* Pull Indicator */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ${
          pullDistance > 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: Math.min(pullDistance, threshold),
          transform: `translateY(${Math.min(pullDistance - threshold, 0)}px)`
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Refreshing...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div 
              className={`w-4 h-4 border-2 border-gray-300 rounded-full transition-all duration-200 ${
                canRefresh ? "border-blue-500" : ""
              }`}
              style={{
                transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)`
              }}
            />
            <span className="text-sm">
              {canRefresh ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={elementRef} className="h-full overflow-auto">
        {children}
      </div>
    </div>
  )
}

