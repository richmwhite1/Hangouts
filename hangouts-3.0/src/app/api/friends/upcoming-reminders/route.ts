import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { getHangoutStats } from '@/lib/services/friend-relationship-service'
import { getFrequencyThresholdDays, getDaysSinceLastHangout } from '@/lib/services/relationship-reminder-service'
import { logger } from '@/lib/logger'

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

    // Get all active friendships with frequency settings
    const friendships = await db.friendship.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        desiredHangoutFrequency: {
          not: null
        }
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    const upcomingReminders = []

    for (const friendship of friendships) {
      try {
        const stats = await getHangoutStats(user.id, friendship.friendId)
        const lastHangoutDate = stats.lastHangoutDate ? new Date(stats.lastHangoutDate) : null
        const frequency = friendship.desiredHangoutFrequency as any
        const thresholdDays = getFrequencyThresholdDays(frequency)
        
        if (!thresholdDays) continue

        const daysSince = lastHangoutDate 
          ? getDaysSinceLastHangout(new Date(lastHangoutDate)) 
          : null
        const daysUntilThreshold = daysSince === null 
          ? thresholdDays 
          : thresholdDays - daysSince

        // Include if within 7 days of threshold or already overdue
        if (daysUntilThreshold <= 7 || daysSince === null || daysSince >= thresholdDays) {
          // Determine status
          let status: 'on-track' | 'approaching' | 'overdue' | 'no-goal' = 'no-goal'
          if (daysSince === null) {
            status = thresholdDays >= 30 ? 'overdue' : 'no-goal'
          } else if (daysSince >= thresholdDays) {
            status = 'overdue'
          } else if (daysUntilThreshold <= 7) {
            status = 'approaching'
          } else {
            status = 'on-track'
          }
          
          upcomingReminders.push({
            friendshipId: friendship.id,
            friend: friendship.friend,
            frequency,
            thresholdDays,
            daysSince,
            daysUntilThreshold: daysUntilThreshold <= 0 ? 0 : daysUntilThreshold,
            status,
            lastHangoutDate: lastHangoutDate?.toISOString() || null
          })
        }
      } catch (error) {
        logger.error(`Error processing friendship ${friendship.id}:`, error)
      }
    }

    // Sort by urgency (overdue first, then by days until threshold)
    upcomingReminders.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (a.status !== 'overdue' && b.status === 'overdue') return 1
      return a.daysUntilThreshold - b.daysUntilThreshold
    })

    return NextResponse.json({
      success: true,
      reminders: upcomingReminders,
      count: upcomingReminders.length
    })
  } catch (error) {
    logger.error('Error fetching upcoming reminders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upcoming reminders' },
      { status: 500 }
    )
  }
}

