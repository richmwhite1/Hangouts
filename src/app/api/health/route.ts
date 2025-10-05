import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Health check started...')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('PORT:', process.env.PORT)
    console.log('HOSTNAME:', process.env.HOSTNAME)
    
    // Test database connection
    console.log('Testing database connection...')
    await db.$queryRaw`SELECT 1`
    console.log('Database connection successful')
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      hostname: process.env.HOSTNAME
    })
  } catch (error) {
    console.error('Health check failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      hostname: process.env.HOSTNAME
    }, { status: 500 })
  }
}














