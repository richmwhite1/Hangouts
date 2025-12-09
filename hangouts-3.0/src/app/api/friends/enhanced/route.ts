import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { getHangoutStats, getSharedHangouts } from '@/lib/services/friend-relationship-service'
import { getTimeElapsedInfo } from '@/lib/friend-relationship-utils'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const friendId = searchParams.get('friendId')

    if (!friendId) {
      return NextResponse.json({ error: 'friendId is required' }, { status: 400 })
    }

    // Get hangout stats (with error handling)
    let hangoutStats
    try {
      hangoutStats = await getHangoutStats(user.id, friendId)
    } catch (error) {
      logger.error('Error getting hangout stats:', error)
      hangoutStats = {
        lastHangoutDate: null,
        totalHangouts: 0,
        lastHangout: undefined
      }
    }

    // Get all shared hangouts (with error handling)
    let allSharedHangouts
    try {
      allSharedHangouts = await getSharedHangouts(user.id, friendId)
    } catch (error) {
      logger.error('Error getting shared hangouts:', error)
      allSharedHangouts = []
    }

    // Filter for upcoming hangouts (startTime in the future)
    const now = new Date()
    const upcomingHangouts = allSharedHangouts
      .filter(hangout => {
        if (!hangout.startTime) return false
        return new Date(hangout.startTime) > now
      })
      .slice(0, 3) // Limit to 3 upcoming hangouts

    // Get friendship to find desiredHangoutFrequency (with error handling)
    let friendship
    let desiredHangoutFrequency = null
    try {
      friendship = await db.friendship.findFirst({
        where: {
          OR: [
            { userId: user.id, friendId: friendId, status: 'ACTIVE' },
            { userId: friendId, friendId: user.id, status: 'ACTIVE' }
          ]
        },
        select: {
          desiredHangoutFrequency: true
        }
      })
      desiredHangoutFrequency = friendship?.desiredHangoutFrequency || null
    } catch (error) {
      logger.error('Error getting friendship:', error)
    }

    // Calculate goal status (with error handling)
    let goalStatus
    try {
      goalStatus = getTimeElapsedInfo(
        hangoutStats.lastHangoutDate,
        desiredHangoutFrequency
      )
    } catch (error) {
      logger.error('Error calculating goal status:', error)
      goalStatus = {
        status: 'no-goal' as any,
        days: null,
        text: 'Never'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hangoutStats: {
          lastHangoutDate: hangoutStats.lastHangoutDate,
          totalHangouts: hangoutStats.totalHangouts,
          lastHangout: hangoutStats.lastHangout
        },
        upcomingHangouts,
        goalStatus,
        desiredHangoutFrequency
      }
    })
  } catch (error: any) {
    logger.error('Error fetching enhanced friend data:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch enhanced friend data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
