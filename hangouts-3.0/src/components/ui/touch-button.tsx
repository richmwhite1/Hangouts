"use client"

import React, { useState, useRef } from 'react'
import { Button } from './button'
import { useHapticFeedback, HapticType } from '@/hooks/use-haptic-feedback'
import { useButtonFeedback } from '@/hooks/use-visual-feedback'
import { cn } from '@/lib/utils'

interface TouchButtonProps extends React.ComponentProps<"button"> {
  hapticType?: HapticType
  hapticEnabled?: boolean
  rippleEffect?: boolean
  touchScale?: number
  disabled?: boolean
  children: React.ReactNode
}

export function TouchButton({
  hapticType = 'light',
  hapticEnabled = false, // Disabled by default for web app
  rippleEffect = true,
  touchScale = 0.95,
  disabled = false,
  className,
  children,
  onClick,
  ...props
}: TouchButtonProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { hapticButton } = useHapticFeedback({ enabled: hapticEnabled })
  const { 
    isPressed, 
    isHovered, 
    isFocused, 
    handlePress, 
    handleHover, 
    handleFocus, 
    getButtonClasses 
  } = useButtonFeedback()

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    
    handlePress()
    
    // Haptic feedback
    if (hapticEnabled) {
      hapticButton(hapticType).onTouchStart?.()
    }

    // Ripple effect
    if (rippleEffect && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top
      
      const newRipple = {
        id: Date.now(),
        x,
        y
      }
      
      setRipples(prev => [...prev, newRipple])
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
      }, 600)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    
    handlePress()
    
    // Haptic feedback for mouse (for testing)
    if (hapticEnabled) {
      hapticButton(hapticType).onMouseDown?.()
    }

    // Ripple effect
    if (rippleEffect && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const newRipple = {
        id: Date.now(),
        x,
        y
      }
      
      setRipples(prev => [...prev, newRipple])
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
      }, 600)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    onClick?.(e)
  }

  return (
    <Button
      ref={buttonRef}
      className={cn(
        'relative overflow-hidden transition-all duration-150 ease-out',
        getButtonClasses(className || ''),
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onFocus={() => handleFocus(true)}
      onBlur={() => handleFocus(false)}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
      
      {/* Ripple Effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            transform: 'scale(0)',
            animation: 'ripple 0.6s linear'
          }}
        />
      ))}
      
      <style jsx>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </Button>
  )
}
