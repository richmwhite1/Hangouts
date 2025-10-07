import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test hangout API: GET request received')
    
    // Test basic database connection
    const hangoutCount = await db.content.count({
      where: { type: 'HANGOUT' }
    })
    
    console.log(`📊 Found ${hangoutCount} hangouts in database`)
    
    return NextResponse.json({
      success: true,
      message: 'Test hangout API working',
      hangoutCount: hangoutCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test hangout API error:', error)
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
