import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Test endpoint - only available in development or for authenticated admins
export async function GET(request: NextRequest) {
  // Disable in production unless explicitly enabled via env var
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  try {
    // Require authentication even in development
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Test basic database connection
    const hangoutCount = await db.content.count({
      where: { type: 'HANGOUT' }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Test hangout API working',
      hangoutCount: hangoutCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Test hangout API error:', error);
    return NextResponse.json(
      { 
        error: 'Test hangout API failed',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
