import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Create a test hangout
    const testHangout = await db.content.create({
      data: {
        id: 'test-hangout-id',
        type: 'HANGOUT',
        title: 'Test Hangout',
        description: 'This is a test hangout to verify the API works',
        location: 'Test Location',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        privacyLevel: 'PUBLIC',
        status: 'ACTIVE',
        creatorId: 'test-user-id',
        image: '/placeholder-hangout.jpg'
      }
    })

    return NextResponse.json({
      success: true,
      data: testHangout,
      message: 'Test hangout created successfully'
    })

  } catch (error) {
    logger.error('Error creating test hangout:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test hangout',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
