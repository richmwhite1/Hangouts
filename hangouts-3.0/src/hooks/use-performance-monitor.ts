"use client"

import { useState, useEffect, useCallback } from 'react'

import { logger } from '@/lib/logger'
interface PerformanceMetrics {
  loadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  memoryUsage?: number
  renderTime: number
}

interface PerformanceMonitorOptions {
  enableMemoryMonitoring?: boolean
  enableRenderMonitoring?: boolean
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    memoryUsage: 0,
    renderTime: 0
  })

  const [isSupported, setIsSupported] = useState(false)

  const measureRenderTime = useCallback((componentName: string) => {
    const start = performance.now()
    
    return () => {
      const end = performance.now()
      const renderTime = end - start
      
      // // console.log(`${componentName} render time: ${renderTime.toFixed(2); // Removed for production}ms`); // Removed for production
      
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.max(prev.renderTime, renderTime)
      }))
    }
  }, [])

  const measureAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const start = performance.now()
    
    try {
      const result = await operation()
      const end = performance.now()
      const duration = end - start
      
      // // console.log(`${operationName} completed in ${duration.toFixed(2); // Removed for production}ms`); // Removed for production
      return result
    } catch (error) {
      const end = performance.now()
      const duration = end - start
      
      logger.error(`${operationName} failed after ${duration.toFixed(2);}ms:`, error)
      throw error
    }
  }, [])

  const measureSyncOperation = useCallback(<T>(
    operation: () => T,
    operationName: string
  ): T => {
    const start = performance.now()
    
    try {
      const result = operation()
      const end = performance.now()
      const duration = end - start
      
      // // console.log(`${operationName} completed in ${duration.toFixed(2); // Removed for production}ms`); // Removed for production
      return result
    } catch (error) {
      const end = performance.now()
      const duration = end - start
      
      logger.error(`${operationName} failed after ${duration.toFixed(2);}ms:`, error)
      throw error
    }
  }, [])

  useEffect(() => {
    // Check if Performance Observer is supported
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    // Measure load time
    const loadTime = performance.now()
    setMetrics(prev => ({ ...prev, loadTime }))

    // Measure Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({
                ...prev,
                firstContentfulPaint: entry.startTime
              }))
            }
            break
          
          case 'largest-contentful-paint':
            setMetrics(prev => ({
              ...prev,
              largestContentfulPaint: entry.startTime
            }))
            break
          
          case 'first-input':
            setMetrics(prev => ({
              ...prev,
              firstInputDelay: entry.processingStart - entry.startTime
            }))
            break
          
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({
                ...prev,
                cumulativeLayoutShift: prev.cumulativeLayoutShift + (entry as any).value
              }))
            }
            break
        }
      }
    })

    // Observe different entry types
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (error) {
      logger.warn('Performance Observer not fully supported:', error);
    }

    // Memory monitoring (if available)
    if (options.enableMemoryMonitoring && 'memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory
        if (memory) {
          setMetrics(prev => ({
            ...prev,
            memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
          }))
        }
      }

      updateMemoryUsage()
      const memoryInterval = setInterval(updateMemoryUsage, 5000)

      return () => {
        observer.disconnect()
        clearInterval(memoryInterval)
      }
    }

    return () => observer.disconnect()
  }, [options.enableMemoryMonitoring])

  // Report metrics when they change
  useEffect(() => {
    if (options.onMetricsUpdate) {
      options.onMetricsUpdate(metrics)
    }
  }, [metrics, options.onMetricsUpdate])

  const getPerformanceScore = useCallback(() => {
    let score = 100

    // FCP scoring (0-100)
    if (metrics.firstContentfulPaint > 3000) score -= 30
    else if (metrics.firstContentfulPaint > 2000) score -= 20
    else if (metrics.firstContentfulPaint > 1500) score -= 10

    // LCP scoring (0-100)
    if (metrics.largestContentfulPaint > 4000) score -= 30
    else if (metrics.largestContentfulPaint > 2500) score -= 20
    else if (metrics.largestContentfulPaint > 2000) score -= 10

    // FID scoring (0-100)
    if (metrics.firstInputDelay > 300) score -= 30
    else if (metrics.firstInputDelay > 100) score -= 20
    else if (metrics.firstInputDelay > 50) score -= 10

    // CLS scoring (0-100)
    if (metrics.cumulativeLayoutShift > 0.25) score -= 30
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 20
    else if (metrics.cumulativeLayoutShift > 0.05) score -= 10

    return Math.max(0, score)
  }, [metrics])

  const getPerformanceGrade = useCallback(() => {
    const score = getPerformanceScore()
    
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }, [getPerformanceScore])

  return {
    metrics,
    isSupported,
    measureRenderTime,
    measureAsyncOperation,
    measureSyncOperation,
    getPerformanceScore,
    getPerformanceGrade
  }
}

