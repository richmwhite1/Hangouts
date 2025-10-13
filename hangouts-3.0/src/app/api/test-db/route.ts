import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    logger.info('Testing database connection...')
    
    // Test basic database connection
    const result = await db.$queryRaw`SELECT 1 as test`
    logger.info('Database connection test result:', result)
    
    // Test if content table exists and is accessible
    const contentCount = await db.content.count()
    logger.info('Content table count:', contentCount)
    
    // Test if users table exists and is accessible
    const userCount = await db.user.count()
    logger.info('User table count:', userCount)
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        testQuery: result,
        contentCount,
        userCount
      }
    })
    
  } catch (error) {
    logger.error('Database connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
