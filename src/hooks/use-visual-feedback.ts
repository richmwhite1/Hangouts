"use client"

import { useState, useCallback, useRef } from 'react'

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface VisualFeedbackOptions {
  duration?: number
  showIcon?: boolean
  position?: 'top' | 'bottom' | 'center'
  animation?: 'slide' | 'fade' | 'bounce' | 'scale'
}

export function useVisualFeedback() {
  const [feedback, setFeedback] = useState<{
    type: FeedbackType
    message: string
    visible: boolean
  }>({
    type: 'info',
    message: '',
    visible: false
  })

  const timeoutRef = useRef<NodeJS.Timeout>()

  const showFeedback = useCallback((
    type: FeedbackType,
    message: string,
    options: VisualFeedbackOptions = {}
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setFeedback({
      type,
      message,
      visible: true
    })

    // Auto-hide after duration
    const duration = options.duration || 3000
    timeoutRef.current = setTimeout(() => {
      setFeedback(prev => ({ ...prev, visible: false }))
    }, duration)
  }, [])

  const hideFeedback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setFeedback(prev => ({ ...prev, visible: false }))
  }, [])

  const showSuccess = useCallback((message: string, options?: VisualFeedbackOptions) => {
    showFeedback('success', message, options)
  }, [showFeedback])

  const showError = useCallback((message: string, options?: VisualFeedbackOptions) => {
    showFeedback('error', message, options)
  }, [showFeedback])

  const showWarning = useCallback((message: string, options?: VisualFeedbackOptions) => {
    showFeedback('warning', message, options)
  }, [showFeedback])

  const showInfo = useCallback((message: string, options?: VisualFeedbackOptions) => {
    showFeedback('info', message, options)
  }, [showFeedback])

  const showLoading = useCallback((message: string, options?: VisualFeedbackOptions) => {
    showFeedback('loading', message, options)
  }, [showFeedback])

  return {
    feedback,
    showFeedback,
    hideFeedback,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading
  }
}

// Enhanced button feedback hook
export function useButtonFeedback() {
  const [isPressed, setIsPressed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handlePress = useCallback(() => {
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)
  }, [])

  const handleHover = useCallback((hovered: boolean) => {
    setIsHovered(hovered)
  }, [])

  const handleFocus = useCallback((focused: boolean) => {
    setIsFocused(focused)
  }, [])

  const getButtonClasses = useCallback((baseClasses: string) => {
    let classes = baseClasses
    
    if (isPressed) {
      classes += ' scale-95 shadow-inner'
    }
    
    if (isHovered) {
      classes += ' shadow-lg'
    }
    
    if (isFocused) {
      classes += ' ring-2 ring-blue-500 ring-offset-2'
    }
    
    return classes
  }, [isPressed, isHovered, isFocused])

  return {
    isPressed,
    isHovered,
    isFocused,
    handlePress,
    handleHover,
    handleFocus,
    getButtonClasses
  }
}

