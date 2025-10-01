"use client"

import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { useVisualFeedback, FeedbackType } from '@/hooks/use-visual-feedback'

interface VisualFeedbackProps {
  type: FeedbackType
  message: string
  visible: boolean
  duration?: number
  showIcon?: boolean
  position?: 'top' | 'bottom' | 'center'
  animation?: 'slide' | 'fade' | 'bounce' | 'scale'
}

export function VisualFeedback({
  type,
  message,
  visible,
  duration = 3000,
  showIcon = true,
  position = 'top',
  animation = 'slide'
}: VisualFeedbackProps) {
  if (!visible) return null

  const getIcon = () => {
    if (!showIcon) return null
    
    const iconClass = "w-5 h-5 mr-2"
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />
      case 'error':
        return <XCircle className={`${iconClass} text-red-500`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />
      case 'info':
        return <Info className={`${iconClass} text-blue-500`} />
      case 'loading':
        return <Loader2 className={`${iconClass} text-blue-500 animate-spin`} />
      default:
        return null
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300'
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
      case 'loading':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-300'
    }
  }

  const getAnimationClass = () => {
    switch (animation) {
      case 'slide':
        return position === 'top' ? 'animate-in slide-in-from-top-2' : 'animate-in slide-in-from-bottom-2'
      case 'fade':
        return 'animate-in fade-in-0'
      case 'bounce':
        return 'animate-in bounce-in'
      case 'scale':
        return 'animate-in zoom-in-95'
      default:
        return 'animate-in slide-in-from-top-2'
    }
  }

  const getPositionClass = () => {
    switch (position) {
      case 'top':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
      default:
        return 'top-4 left-1/2 transform -translate-x-1/2'
    }
  }

  return (
    <div
      className={`fixed z-50 ${getPositionClass()} ${getAnimationClass()}`}
      style={{
        animationDuration: '0.3s',
        animationFillMode: 'both'
      }}
    >
      <div
        className={`
          flex items-center px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm
          ${getBackgroundColor()}
          animate-in fade-in-0 slide-in-from-top-2 duration-300
        `}
      >
        {getIcon()}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

// Toast provider component
export function VisualFeedbackProvider({ children }: { children: React.ReactNode }) {
  const { feedback, hideFeedback } = useVisualFeedback()

  return (
    <>
      {children}
      <VisualFeedback
        type={feedback.type}
        message={feedback.message}
        visible={feedback.visible}
        onClose={hideFeedback}
      />
    </>
  )
}

