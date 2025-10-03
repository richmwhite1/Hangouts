"use client"

import { memo, useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Database, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { usePerformanceMonitor } from '@/lib/performance-monitor'
import { getCacheStats } from '@/lib/cache'
import { databaseOptimizer } from '@/lib/database-optimizer'
import { cn } from '@/lib/utils'

interface PerformanceDashboardProps {
  className?: string
  refreshInterval?: number
}

export const PerformanceDashboard = memo(function PerformanceDashboard({ 
  className,
  refreshInterval = 30000
}: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [dbStats, setDbStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const { getReport } = usePerformanceMonitor()

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [perfData, cacheData, dbData] = await Promise.all([
        getReport(),
        Promise.resolve(getCacheStats()),
        databaseOptimizer.analyzePerformance()
      ])
      
      setPerformanceData(perfData)
      setCacheStats(cacheData)
      setDbStats(dbData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to refresh performance data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getReport])

  useEffect(() => {
    refreshData()
    
    if (refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshData, refreshInterval])

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600'
    if (value >= thresholds.warning) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <AlertTriangle className="h-4 w-4 text-red-600" />
    if (value >= thresholds.warning) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Core Web Vitals</p>
                <p className="text-2xl font-bold">
                  {performanceData?.coreWebVitals?.lcp ? 
                    formatTime(performanceData.coreWebVitals.lcp) : 'N/A'
                  }
                </p>
              </div>
              {performanceData?.coreWebVitals?.lcp && 
                getStatusIcon(performanceData.coreWebVitals.lcp, { warning: 2500, critical: 4000 })
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Response</p>
                <p className="text-2xl font-bold">
                  {performanceData?.apiPerformance?.averageResponseTime ? 
                    formatTime(performanceData.apiPerformance.averageResponseTime) : 'N/A'
                  }
                </p>
              </div>
              {performanceData?.apiPerformance?.averageResponseTime && 
                getStatusIcon(performanceData.apiPerformance.averageResponseTime, { warning: 500, critical: 1000 })
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className="text-2xl font-bold">
                  {performanceData?.memoryUsage?.current ? 
                    formatBytes(performanceData.memoryUsage.current) : 'N/A'
                  }
                </p>
              </div>
              {performanceData?.memoryUsage?.current && 
                getStatusIcon(performanceData.memoryUsage.current / (1024 * 1024), { warning: 50, critical: 100 })
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <p className="text-2xl font-bold">
                  {dbStats?.averageQueryTime ? 
                    formatTime(dbStats.averageQueryTime) : 'N/A'
                  }
                </p>
              </div>
              {dbStats?.averageQueryTime && 
                getStatusIcon(dbStats.averageQueryTime, { warning: 200, critical: 500 })
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Core Web Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Largest Contentful Paint</span>
                  <Badge variant={performanceData?.coreWebVitals?.lcp > 2500 ? 'destructive' : 'default'}>
                    {performanceData?.coreWebVitals?.lcp ? formatTime(performanceData.coreWebVitals.lcp) : 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>First Input Delay</span>
                  <Badge variant={performanceData?.coreWebVitals?.fid > 100 ? 'destructive' : 'default'}>
                    {performanceData?.coreWebVitals?.fid ? formatTime(performanceData.coreWebVitals.fid) : 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cumulative Layout Shift</span>
                  <Badge variant={performanceData?.coreWebVitals?.cls > 0.1 ? 'destructive' : 'default'}>
                    {performanceData?.coreWebVitals?.cls ? performanceData.coreWebVitals.cls.toFixed(3) : 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  API Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Average Response Time</span>
                  <Badge variant={performanceData?.apiPerformance?.averageResponseTime > 500 ? 'destructive' : 'default'}>
                    {performanceData?.apiPerformance?.averageResponseTime ? 
                      formatTime(performanceData.apiPerformance.averageResponseTime) : 'N/A'
                    }
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>P95 Response Time</span>
                  <Badge variant={performanceData?.apiPerformance?.p95ResponseTime > 1000 ? 'destructive' : 'default'}>
                    {performanceData?.apiPerformance?.p95ResponseTime ? 
                      formatTime(performanceData.apiPerformance.p95ResponseTime) : 'N/A'
                    }
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Error Rate</span>
                  <Badge variant={performanceData?.apiPerformance?.errorRate > 0.05 ? 'destructive' : 'default'}>
                    {performanceData?.apiPerformance?.errorRate ? 
                      formatPercentage(performanceData.apiPerformance.errorRate) : 'N/A'
                    }
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Page Load Time</span>
                  <span className="font-mono">
                    {performanceData?.pageLoad?.average ? 
                      formatTime(performanceData.pageLoad.average) : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Memory Usage</span>
                  <span className="font-mono">
                    {performanceData?.memoryUsage?.current ? 
                      formatBytes(performanceData.memoryUsage.current) : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Peak Memory Usage</span>
                  <span className="font-mono">
                    {performanceData?.memoryUsage?.peak ? 
                      formatBytes(performanceData.memoryUsage.peak) : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cacheStats && Object.entries(cacheStats).map(([name, stats]: [string, any]) => (
              <Card key={name}>
                <CardHeader>
                  <CardTitle className="capitalize">{name} Cache</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono">{stats.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span className="font-mono">{formatPercentage(stats.hitRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Hits:</span>
                    <span className="font-mono">{stats.averageHits.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Database Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span>Total Queries:</span>
                  <span className="font-mono">{dbStats?.totalQueries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Query Time:</span>
                  <span className="font-mono">
                    {dbStats?.averageQueryTime ? formatTime(dbStats.averageQueryTime) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Slow Queries:</span>
                  <span className="font-mono">{dbStats?.slowQueries?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection Pool:</span>
                  <span className="font-mono">
                    {dbStats?.connectionPool ? 
                      `${dbStats.connectionPool.active}/${dbStats.connectionPool.total}` : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
})
















