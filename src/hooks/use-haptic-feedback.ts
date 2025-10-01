"use client"

import { useCallback } from 'react'

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

interface HapticFeedbackOptions {
  enabled?: boolean
  intensity?: number
}

export function useHapticFeedback(options: HapticFeedbackOptions = {}) {
  const { enabled = false } = options // Disabled by default for web app

  const triggerHaptic = useCallback((type: HapticType) => {
    // Only enable haptic feedback on mobile devices with vibration support
    if (!enabled || typeof window === 'undefined') return
    if (!('vibrate' in navigator)) return

    const patterns: Record<HapticType, number | number[]> = {
      light: [10],
      medium: [20],
      heavy: [50],
      success: [10, 50, 10],
      warning: [20, 10, 20],
      error: [100, 50, 100]
    }

    const pattern = patterns[type]
    if (pattern) {
      navigator.vibrate(pattern)
    }
  }, [enabled])

  const hapticButton = useCallback((type: HapticType = 'light') => {
    return {
      onTouchStart: () => triggerHaptic(type),
      onMouseDown: () => triggerHaptic(type)
    }
  }, [triggerHaptic])

  const hapticSuccess = useCallback(() => triggerHaptic('success'), [triggerHaptic])
  const hapticWarning = useCallback(() => triggerHaptic('warning'), [triggerHaptic])
  const hapticError = useCallback(() => triggerHaptic('error'), [triggerHaptic])
  const hapticLight = useCallback(() => triggerHaptic('light'), [triggerHaptic])
  const hapticMedium = useCallback(() => triggerHaptic('medium'), [triggerHaptic])
  const hapticHeavy = useCallback(() => triggerHaptic('heavy'), [triggerHaptic])

  return {
    triggerHaptic,
    hapticButton,
    hapticSuccess,
    hapticWarning,
    hapticError,
    hapticLight,
    hapticMedium,
    hapticHeavy
  }
}
