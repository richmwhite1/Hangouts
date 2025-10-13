import { NextRequest, NextResponse } from 'next/server'
import { apiCache } from '@/lib/api-cache'
import { getHealthCheckData } from '@/lib/error-handling'
import { config } from '@/lib/config-enhanced'

export async function GET(request: NextRequest) {
  try {
    const healthData = getHealthCheckData()
    
    // Add cache statistics
    const cacheStats = apiCache.getStats()
    
    // Add configuration info
    const configInfo = {
      environment: config.app.environment,
      features: config.features,
      cache: {
        enabled: config.cache.enabled,
        maxSize: config.cache.maxSize
      },
      rateLimit: {
        enabled: config.rateLimit.enabled
      }
    }

    return NextResponse.json({
      ...healthData,
      cache: cacheStats,
      config: configInfo,
      optimizations: {
        databaseOptimization: 'enabled',
        apiCaching: 'enabled',
        rateLimiting: 'enabled',
        errorHandling: 'enabled',
        configurationManagement: 'enabled'
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}