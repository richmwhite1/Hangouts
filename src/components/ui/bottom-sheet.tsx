"use client"

import React, { useEffect, useRef, useState } from 'react'
import { X, GripHorizontal } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  showDragHandle?: boolean
  snapPoints?: number[] // Heights as percentages (0-100)
  defaultSnapPoint?: number // Default snap point index
  hapticEnabled?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  showDragHandle = true,
  snapPoints = [25, 50, 90], // 25%, 50%, 90% of screen height
  defaultSnapPoint = 1, // Default to 50%
  hapticEnabled = true
}: BottomSheetProps) {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(defaultSnapPoint)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { hapticLight, hapticMedium } = useHapticFeedback({ enabled: hapticEnabled })

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showDragHandle) return
    
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
    hapticLight()
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !showDragHandle) return
    
    e.preventDefault()
    const touchY = e.touches[0].clientY
    setCurrentY(touchY)
    
    // Calculate drag distance
    const dragDistance = touchY - startY
    
    // Update sheet position based on drag
    if (sheetRef.current) {
      const currentHeight = snapPoints[currentSnapPoint]
      const newHeight = Math.max(10, Math.min(95, currentHeight + (dragDistance / window.innerHeight) * 100))
      sheetRef.current.style.height = `${newHeight}%`
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging || !showDragHandle) return
    
    setIsDragging(false)
    
    // Calculate final position and snap to nearest point
    const dragDistance = currentY - startY
    const currentHeight = snapPoints[currentSnapPoint]
    const newHeight = currentHeight + (dragDistance / window.innerHeight) * 100
    
    // Find closest snap point
    let closestSnapPoint = 0
    let minDistance = Math.abs(newHeight - snapPoints[0])
    
    for (let i = 1; i < snapPoints.length; i++) {
      const distance = Math.abs(newHeight - snapPoints[i])
      if (distance < minDistance) {
        minDistance = distance
        closestSnapPoint = i
      }
    }
    
    // If dragged down significantly, close the sheet
    if (dragDistance > 100 && closestSnapPoint === 0) {
      onClose()
      hapticMedium()
      return
    }
    
    setCurrentSnapPoint(closestSnapPoint)
    hapticLight()
    
    // Reset position
    if (sheetRef.current) {
      sheetRef.current.style.height = `${snapPoints[closestSnapPoint]}%`
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={cn(
          "bg-white dark:bg-gray-900 rounded-t-xl w-full flex flex-col shadow-xl transition-all duration-300 ease-out",
          "animate-in slide-in-from-bottom-4",
          className
        )}
        style={{
          height: `${snapPoints[currentSnapPoint]}%`,
          maxHeight: '95vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div className="flex justify-center py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showDragHandle) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// Hook for programmatic control
export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [snapPoint, setSnapPoint] = useState(1)

  const open = (snapPointIndex = 1) => {
    setSnapPoint(snapPointIndex)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  const toggle = (snapPointIndex = 1) => {
    if (isOpen) {
      close()
    } else {
      open(snapPointIndex)
    }
  }

  return {
    isOpen,
    snapPoint,
    open,
    close,
    toggle
  }
}

