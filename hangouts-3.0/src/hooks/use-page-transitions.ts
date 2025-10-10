"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PageTransitionOptions {
  duration?: number
  type?: 'fade' | 'slide' | 'scale' | 'none'
  direction?: 'left' | 'right' | 'up' | 'down'
}

export function usePageTransitions(options: PageTransitionOptions = {}) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionType, setTransitionType] = useState(options.type || 'fade')
  const router = useRouter()

  const navigateWithTransition = useCallback((
    href: string, 
    transitionOptions?: Partial<PageTransitionOptions>
  ) => {
    const { type = transitionType, duration = 300 } = { ...options, ...transitionOptions }
    
    if (type === 'none') {
      router.push(href)
      return
    }

    setIsTransitioning(true)
    
    // Start transition out
    setTimeout(() => {
      router.push(href)
      
      // Complete transition in
      setTimeout(() => {
        setIsTransitioning(false)
      }, duration / 2)
    }, duration / 2)
  }, [router, transitionType, options])

  const getTransitionClasses = useCallback((direction?: string) => {
    const dir = direction || options.direction || 'right'
    
    if (isTransitioning) {
      switch (options.type || 'fade') {
        case 'fade':
          return 'opacity-0 transition-opacity duration-300'
        case 'slide':
          switch (dir) {
            case 'left':
              return 'transform -translate-x-full transition-transform duration-300'
            case 'right':
              return 'transform translate-x-full transition-transform duration-300'
            case 'up':
              return 'transform -translate-y-full transition-transform duration-300'
            case 'down':
              return 'transform translate-y-full transition-transform duration-300'
            default:
              return 'transform translate-x-full transition-transform duration-300'
          }
        case 'scale':
          return 'transform scale-95 opacity-0 transition-all duration-300'
        default:
          return 'opacity-0 transition-opacity duration-300'
      }
    }
    
    return 'opacity-100 transition-opacity duration-300'
  }, [isTransitioning, options.type, options.direction])

  return {
    isTransitioning,
    navigateWithTransition,
    getTransitionClasses,
    setTransitionType
  }
}

// Page transition wrapper component
export function PageTransitionWrapper({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const { getTransitionClasses } = usePageTransitions()
  
  return (
    <div className={`${getTransitionClasses()} ${className}`}>
      {children}
    </div>
  )
}

