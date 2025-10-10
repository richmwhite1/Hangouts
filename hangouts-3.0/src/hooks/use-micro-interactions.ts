"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

interface MicroInteractionOptions {
  duration?: number
  scale?: number
  bounce?: boolean
  glow?: boolean
  shadow?: boolean
}

export function useMicroInteractions(options: MicroInteractionOptions = {}) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  const {
    duration = 200,
    scale = 0.95,
    bounce = false,
    glow = false,
    shadow = true
  } = options

  const handleActivate = useCallback(() => {
    setIsActive(true)
    setTimeout(() => setIsActive(false), duration)
  }, [duration])

  const handleHover = useCallback((hovered: boolean) => {
    setIsHovered(hovered)
  }, [])

  const handleFocus = useCallback((focused: boolean) => {
    setIsFocused(focused)
  }, [])

  const getInteractionClasses = useCallback((baseClasses: string = '') => {
    let classes = baseClasses

    // Scale animation
    if (isActive) {
      classes += ` transform scale-${scale}`
    }

    // Hover effects
    if (isHovered) {
      classes += ' hover:scale-105'
      if (shadow) classes += ' hover:shadow-lg'
      if (glow) classes += ' hover:shadow-blue-500/25'
    }

    // Focus effects
    if (isFocused) {
      classes += ' focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    }

    // Bounce animation
    if (bounce && isActive) {
      classes += ' animate-bounce'
    }

    // Transition
    classes += ` transition-all duration-${duration}`

    return classes
  }, [isActive, isHovered, isFocused, scale, shadow, glow, bounce, duration])

  const getInteractionStyle = useCallback(() => {
    const style: React.CSSProperties = {}

    if (isActive) {
      style.transform = `scale(${scale})`
    }

    if (isHovered && glow) {
      style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)'
    }

    return style
  }, [isActive, isHovered, scale, glow])

  return {
    isActive,
    isHovered,
    isFocused,
    elementRef,
    handleActivate,
    handleHover,
    handleFocus,
    getInteractionClasses,
    getInteractionStyle
  }
}

// Card hover effect hook
export function useCardHover() {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isHovered) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setMousePosition({ x, y })
  }, [isHovered])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const getCardClasses = useCallback((baseClasses: string = '') => {
    return `${baseClasses} ${isHovered ? 'shadow-xl transform -translate-y-1' : 'shadow-md'} transition-all duration-300`
  }, [isHovered])

  const getCardStyle = useCallback(() => {
    if (!isHovered) return {}

    const rotateX = (mousePosition.y - 150) / 10
    const rotateY = (mousePosition.x - 150) / 10

    return {
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`
    }
  }, [isHovered, mousePosition])

  return {
    isHovered,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
    getCardClasses,
    getCardStyle
  }
}

// Stagger animation hook
export function useStaggerAnimation(delay: number = 100) {
  const [isVisible, setIsVisible] = useState(false)
  const [staggeredItems, setStaggeredItems] = useState<boolean[]>([])

  const startStagger = useCallback((itemCount: number) => {
    setIsVisible(true)
    
    const items = new Array(itemCount).fill(false)
    setStaggeredItems(items)

    items.forEach((_, index) => {
      setTimeout(() => {
        setStaggeredItems(prev => 
          prev.map((item, i) => i === index ? true : item)
        )
      }, index * delay)
    })
  }, [delay])

  const resetStagger = useCallback(() => {
    setIsVisible(false)
    setStaggeredItems([])
  }, [])

  const getStaggerClasses = useCallback((index: number, baseClasses: string = '') => {
    const isStaggered = staggeredItems[index]
    return `${baseClasses} ${isStaggered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-300`
  }, [staggeredItems])

  return {
    isVisible,
    staggeredItems,
    startStagger,
    resetStagger,
    getStaggerClasses
  }
}

