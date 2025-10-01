"use client"

import React from 'react'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'

interface PerformanceMonitorProps {
  enabled?: boolean
  showMetrics?: boolean
  className?: string
}

export function PerformanceMonitor({ 
  enabled = false, 
  showMetrics = false, 
  className = '' 
}: PerformanceMonitorProps) {
  const { metrics, getPerformanceScore, getPerformanceGrade } = usePerformanceMonitor({
    enableMemoryMonitoring: true,
    onMetricsUpdate: (metrics) => {
      if (enabled) {
        console.log('Performance Metrics:', metrics)
      }
    }
  })

  if (!enabled || !showMetrics) return null

  const score = getPerformanceScore()
  const grade = getPerformanceGrade()

  return (
    <div className={`fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs ${className}`}>
      <div className="font-bold mb-2">Performance Monitor</div>
      <div className="space-y-1">
        <div>Score: {score}/100 ({grade})</div>
        <div>FCP: {metrics.firstContentfulPaint.toFixed(0)}ms</div>
        <div>LCP: {metrics.largestContentfulPaint.toFixed(0)}ms</div>
        <div>FID: {metrics.firstInputDelay.toFixed(0)}ms</div>
        <div>CLS: {metrics.cumulativeLayoutShift.toFixed(3)}</div>
        {metrics.memoryUsage && (
          <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
        )}
      </div>
    </div>
  )
}

