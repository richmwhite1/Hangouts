"use client"

import { memo, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Wifi, WifiOff, Clock, Zap } from 'lucide-react'
import { useSocket } from '@/contexts/socket-context'
import { cn } from '@/lib/utils'

interface PerformanceMetrics {
  connectionLatency: number
  messageCount: number
  errorCount: number
  lastActivity: Date
  isConnected: boolean
}

interface PerformanceMonitorProps {
  className?: string
  showDetails?: boolean
}

export const PerformanceMonitor = memo(function PerformanceMonitor({ 
  className,
  showDetails = false 
}: PerformanceMonitorProps) {
  const { socket, isConnected, connectionError, reconnectAttempts } = useSocket()
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    connectionLatency: 0,
    messageCount: 0,
    errorCount: 0,
    lastActivity: new Date(),
    isConnected: false
  })
  const [isVisible, setIsVisible] = useState(false)

  // Measure connection latency
  const measureLatency = useCallback(() => {
    if (!socket || !isConnected) return

    const startTime = Date.now()
    socket.emit('ping', () => {
      const latency = Date.now() - startTime
      setMetrics(prev => ({
        ...prev,
        connectionLatency: latency,
        lastActivity: new Date()
      }))
    })
  }, [socket, isConnected])

  // Monitor socket events
  useEffect(() => {
    if (!socket) return

    const handleMessage = () => {
      setMetrics(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1,
        lastActivity: new Date()
      }))
    }

    const handleError = () => {
      setMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastActivity: new Date()
      }))
    }

    const handleConnect = () => {
      setMetrics(prev => ({
        ...prev,
        isConnected: true,
        lastActivity: new Date()
      }))
    }

    const handleDisconnect = () => {
      setMetrics(prev => ({
        ...prev,
        isConnected: false
      }))
    }

    // Listen to all events
    socket.onAny(handleMessage)
    socket.on('error', handleError)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.offAny(handleMessage)
      socket.off('error', handleError)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [socket])

  // Measure latency periodically
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(measureLatency, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [isConnected, measureLatency])

  // Update connection status
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      isConnected
    }))
  }, [isConnected])

  const getConnectionStatus = () => {
    if (isConnected) {
      if (metrics.connectionLatency < 100) return { status: 'excellent', color: 'text-green-600' }
      if (metrics.connectionLatency < 300) return { status: 'good', color: 'text-yellow-600' }
      return { status: 'slow', color: 'text-red-600' }
    }
    return { status: 'disconnected', color: 'text-gray-600' }
  }

  const connectionStatus = getConnectionStatus()

  if (!isVisible && !showDetails) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Performance Monitor
          </span>
          {!showDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-xs", connectionStatus.color)}
          >
            {connectionStatus.status}
          </Badge>
        </div>

        {/* Latency */}
        {isConnected && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Latency</span>
            <span className="text-sm font-mono">
              {metrics.connectionLatency}ms
            </span>
          </div>
        )}

        {/* Message Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Messages</span>
          <span className="text-sm font-mono">{metrics.messageCount}</span>
        </div>

        {/* Error Count */}
        {metrics.errorCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Errors</span>
            <span className="text-sm font-mono text-red-600">
              {metrics.errorCount}
            </span>
          </div>
        )}

        {/* Reconnect Attempts */}
        {reconnectAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reconnects</span>
            <span className="text-sm font-mono text-yellow-600">
              {reconnectAttempts}
            </span>
          </div>
        )}

        {/* Last Activity */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Activity</span>
          <span className="text-xs text-muted-foreground">
            {metrics.lastActivity.toLocaleTimeString()}
          </span>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600">
            {connectionError}
          </div>
        )}

        {/* Performance Tips */}
        {isConnected && metrics.connectionLatency > 300 && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-600">
            <Zap className="h-3 w-3 inline mr-1" />
            High latency detected. Check your internet connection.
          </div>
        )}
      </CardContent>
    </Card>
  )
})























