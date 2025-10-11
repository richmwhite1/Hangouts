import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function GET() {
  try {
    // console.log('🔍 Test hangout API: GET request received'); // Removed for production
    
    // Test basic database connection
    const hangoutCount = await db.content.count({
      where: { type: 'HANGOUT' }
    })
    
    // // console.log(`📊 Found ${hangoutCount} hangouts in database`); // Removed for production; // Removed for production
    
    return NextResponse.json({
      success: true,
      message: 'Test hangout API working',
      hangoutCount: hangoutCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('❌ Test hangout API error:', error);
    return NextResponse.json(
      { 
        error: 'Test hangout API failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
