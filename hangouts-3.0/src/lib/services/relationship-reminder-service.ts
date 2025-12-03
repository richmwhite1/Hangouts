import { db } from '@/lib/db'
import { getHangoutStats } from './friend-relationship-service'
import { triggerNotification } from '@/lib/notification-triggers'
import { logger } from '@/lib/logger'

export type HangoutFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUALLY' | 'SOMETIMES'

/**
 * Get the number of days threshold for a given frequency
 */
export function getFrequencyThresholdDays(frequency: HangoutFrequency | null): number | null {
  if (!frequency) return null

  switch (frequency) {
    case 'MONTHLY':
      return 30
    case 'QUARTERLY':
      return 90
    case 'SEMI_ANNUAL':
      return 180
    case 'ANNUALLY':
      return 365
    case 'SOMETIMES':
      return 90 // Gentle reminder every 3 months
    default:
      return null
  }
}

/**
 * Calculate days since last hangout
 */
export function getDaysSinceLastHangout(lastHangoutDate: Date | string | null | undefined): number | null {
  if (!lastHangoutDate) return null

  const now = new Date()
  const lastHangout = new Date(lastHangoutDate)
  const diffTime = Math.abs(now.getTime() - lastHangout.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if a reminder should be sent for a friendship
 */
export async function shouldSendReminder(
  userId: string,
  friendId: string,
  frequency: HangoutFrequency | null,
  lastHangoutDate: Date | null | undefined
): Promise<boolean> {
  if (!frequency) return false

  const thresholdDays = getFrequencyThresholdDays(frequency)
  if (!thresholdDays) return false

  const daysSince = getDaysSinceLastHangout(lastHangoutDate)
  if (daysSince === null) {
    // No hangout ever - send reminder after threshold
    return thresholdDays >= 30 // At least wait 30 days for new friendships
  }

  // Check if threshold exceeded
  if (daysSince < thresholdDays) return false

  // Check if we've sent a notification recently (within last 7 days)
  // Note: Prisma JSON filtering is limited, so we'll check all recent notifications
  // and filter in code
  const recentNotifications = await db.notification.findMany({
    where: {
      userId: userId,
      type: 'RELATIONSHIP_REMINDER',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50 // Check recent notifications
  })

  // Filter in code to find notification for this specific friend
  const recentNotification = recentNotifications.find(notif => {
    try {
      const data = notif.data as any
      return data?.friendId === friendId
    } catch {
      return false
    }
  })

  // Don't send if we sent one recently
  if (recentNotification) return false

  return true
}

/**
 * Check all friendships and send relationship reminders where needed
 */
export async function checkRelationshipReminders(): Promise<{
  checked: number
  sent: number
  errors: number
}> {
  let checked = 0
  let sent = 0
  let errors = 0

  try {
    // Get all active friendships with a frequency setting
    const friendships = await db.friendship.findMany({
      where: {
        status: 'ACTIVE',
        desiredHangoutFrequency: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    checked = friendships.length

    for (const friendship of friendships) {
      try {
        // Get hangout stats for this friendship
        const stats = await getHangoutStats(friendship.userId, friendship.friendId)
        
        const lastHangoutDate = stats.lastHangoutDate 
          ? new Date(stats.lastHangoutDate) 
          : null

        // Check if reminder should be sent
        const shouldSend = await shouldSendReminder(
          friendship.userId,
          friendship.friendId,
          friendship.desiredHangoutFrequency as HangoutFrequency,
          lastHangoutDate
        )

        if (shouldSend) {
          const daysSince = getDaysSinceLastHangout(lastHangoutDate)
          const frequency = friendship.desiredHangoutFrequency as HangoutFrequency
          const thresholdDays = getFrequencyThresholdDays(frequency) || 0

          // Format last hangout date
          const lastHangoutText = lastHangoutDate
            ? new Date(lastHangoutDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'never'

          // Create notification
          await triggerNotification({
            type: 'RELATIONSHIP_REMINDER',
            recipientId: friendship.userId,
            title: `Time to reconnect with ${friendship.friend.name}`,
            message: lastHangoutDate
              ? `You haven't hung out with ${friendship.friend.name} since ${lastHangoutText}. It's been ${daysSince} days - time to plan something!`
              : `You haven't hung out with ${friendship.friend.name} yet. It's been ${daysSince || thresholdDays} days since you became friends - time to plan your first hangout!`,
            data: {
              friendId: friendship.friendId,
              friendName: friendship.friend.name,
              lastHangoutDate: lastHangoutDate?.toISOString() || null,
              daysSinceLastHangout: daysSince,
              desiredFrequency: frequency,
              thresholdDays: thresholdDays
            }
          })

          sent++
          logger.info(`Sent relationship reminder to user ${friendship.userId} for friend ${friendship.friendId}`)
        }
      } catch (error) {
        errors++
        logger.error(`Error checking reminder for friendship ${friendship.id}:`, error)
      }
    }
  } catch (error) {
    logger.error('Error checking relationship reminders:', error)
    errors++
  }

  return { checked, sent, errors }
}

