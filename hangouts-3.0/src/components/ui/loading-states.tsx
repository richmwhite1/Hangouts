"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
}

export function Skeleton({ 
  className, 
  width = '100%', 
  height = '1rem', 
  rounded = true 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        rounded && 'rounded',
        className
      )}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonHangoutCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Skeleton height="200px" width="100%" rounded={false} />
      <div className="p-4 space-y-3">
        <Skeleton height="1.25rem" width="80%" />
        <Skeleton height="1rem" width="100%" />
        <Skeleton height="1rem" width="60%" />
        <div className="flex items-center justify-between">
          <Skeleton height="1rem" width="40%" />
          <Skeleton height="2rem" width="80px" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonEventCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Skeleton height="150px" width="100%" rounded={false} />
      <div className="p-4 space-y-3">
        <Skeleton height="1.25rem" width="90%" />
        <Skeleton height="1rem" width="70%" />
        <div className="flex items-center space-x-2">
          <Skeleton height="1rem" width="20px" />
          <Skeleton height="1rem" width="100px" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton height="1rem" width="60px" />
          <Skeleton height="2rem" width="100px" />
        </div>
      </div>
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingButtonProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

export function LoadingButton({ 
  loading = false, 
  children, 
  className, 
  disabled = false,
  onClick 
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-all duration-200',
        'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  )
}

interface LoadingOverlayProps {
  loading?: boolean
  children: React.ReactNode
  message?: string
}

export function LoadingOverlay({ 
  loading = false, 
  children, 
  message = 'Loading...' 
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
}

export function ProgressBar({ 
  progress, 
  className, 
  showPercentage = false 
}: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Progress
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

