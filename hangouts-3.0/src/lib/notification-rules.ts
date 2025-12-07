import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export type NotificationType = 
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'MESSAGE_RECEIVED'
  | 'CONTENT_INVITATION'
  | 'CONTENT_RSVP'
  | 'CONTENT_REMINDER'
  | 'CONTENT_UPDATE'
  | 'COMMUNITY_INVITATION'
  | 'MENTION'
  | 'LIKE'
  | 'COMMENT'
  | 'SHARE'
  | 'POLL_VOTE_CAST'
  | 'POLL_CONSENSUS_REACHED'
  | 'HANGOUT_CONFIRMED'
  | 'HANGOUT_CANCELLED'
  | 'HANGOUT_REMINDER'
  | 'HANGOUT_STARTING_SOON'
  | 'HANGOUT_VOTE_NEEDED'
  | 'HANGOUT_RSVP_NEEDED'
  | 'HANGOUT_MANDATORY_RSVP'
  | 'HANGOUT_NEW_MESSAGE'
  | 'HANGOUT_NEW_PHOTO'
  | 'HANGOUT_NEW_COMMENT'
  | 'HANGOUT_POLL_CLOSING_SOON'
  | 'EVENT_REMINDER'
  | 'EVENT_STARTING_SOON'
  | 'PHOTO_SHARED'
  | 'RELATIONSHIP_REMINDER'

export interface PendingNotification {
  id: string
  type: NotificationType
  recipientId: string
  title: string
  message: string
  data?: Record<string, any>
  senderId?: string
  relatedId?: string
  priority: 'high' | 'medium' | 'low'
  createdAt: Date
}

export interface BatchedNotification {
  type: NotificationType
  recipientId: string
  title: string
  message: string
  count: number
  data?: Record<string, any>
  relatedId?: string
  createdAt: Date
}

/**
 * Check if we should send this notification based on smart rules
 */
export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  relatedId?: string,
  senderId?: string
): Promise<boolean> {
  try {
    // Don't notify users about their own actions
    if (senderId && senderId === userId) {
      return false
    }

    // Check for duplicate notifications within time window
    if (relatedId) {
      const timeWindow = getNotificationTimeWindow(type)
      const recentNotification = await db.notification.findFirst({
        where: {
          userId,
          type: type as any,
          data: {
            path: ['relatedId'],
            equals: relatedId
          },
          createdAt: {
            gte: new Date(Date.now() - timeWindow)
          }
        }
      })

      if (recentNotification) {
        logger.info(`Skipping duplicate notification for user ${userId}, type ${type}`)
        return false
      }
    }

    // Check quiet hours
    if (isQuietHours() && !isCriticalNotification(type)) {
      logger.info(`Skipping non-critical notification during quiet hours for user ${userId}`)
      return false
    }

    // Check user's last activity
    const shouldRespectActivity = await shouldRespectUserActivity(userId, type)
    if (shouldRespectActivity) {
      const lastActivity = await getUserLastActivity(userId)
      const hoursSinceActivity = lastActivity ? 
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60) : 24

      // Don't send low-priority notifications to inactive users
      if (hoursSinceActivity > 24 && isLowPriorityNotification(type)) {
        logger.info(`Skipping low-priority notification for inactive user ${userId}`)
        return false
      }
    }

    return true
  } catch (error) {
    logger.error('Error checking if should send notification:', error)
    return true // Default to sending if check fails
  }
}

/**
 * Get time window for duplicate notification checking based on type
 */
function getNotificationTimeWindow(type: NotificationType): number {
  switch (type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
    case 'CONTENT_INVITATION':
    case 'POLL_CONSENSUS_REACHED':
    case 'HANGOUT_CONFIRMED':
    case 'HANGOUT_CANCELLED':
      return 5 * 60 * 1000 // 5 minutes for critical notifications
    
    case 'MESSAGE_RECEIVED':
      return 2 * 60 * 1000 // 2 minutes for messages
    
    case 'CONTENT_RSVP':
    case 'COMMENT':
    case 'MENTION':
      return 10 * 60 * 1000 // 10 minutes for social interactions
    
    case 'LIKE':
    case 'SHARE':
    case 'POLL_VOTE_CAST':
      return 30 * 60 * 1000 // 30 minutes for low-priority notifications
    
    case 'CONTENT_UPDATE':
    case 'CONTENT_REMINDER':
    case 'COMMUNITY_INVITATION':
      return 60 * 60 * 1000 // 1 hour for updates and reminders
    
    default:
      return 5 * 60 * 1000 // Default 5 minutes
  }
}

/**
 * Check if current time is within quiet hours (9pm - 8am)
 */
function isQuietHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  return hour >= 21 || hour < 8
}

/**
 * Check if notification type is critical and should be sent during quiet hours
 */
function isCriticalNotification(type: NotificationType): boolean {
  const criticalTypes: NotificationType[] = [
    'FRIEND_REQUEST',
    'CONTENT_INVITATION',
    'MESSAGE_RECEIVED',
    'POLL_CONSENSUS_REACHED',
    'HANGOUT_CANCELLED'
  ]
  return criticalTypes.includes(type)
}

/**
 * Check if notification type is low priority
 */
function isLowPriorityNotification(type: NotificationType): boolean {
  const lowPriorityTypes: NotificationType[] = [
    'LIKE',
    'SHARE',
    'POLL_VOTE_CAST',
    'CONTENT_UPDATE'
  ]
  return lowPriorityTypes.includes(type)
}

/**
 * Check if we should respect user activity for this notification type
 */
async function shouldRespectUserActivity(userId: string, type: NotificationType): Promise<boolean> {
  // Always respect activity for low-priority notifications
  if (isLowPriorityNotification(type)) {
    return true
  }

  // For critical notifications, check user preferences
  try {
    const preference = await db.notificationPreference.findUnique({
      where: {
        userId_type: {
          userId,
          type: type as any
        }
      }
    })

    // If user has explicitly disabled this type, respect their activity
    return preference ? !preference.inAppEnabled : false
  } catch (error) {
    logger.error('Error checking user activity preference:', error)
    return false
  }
}

/**
 * Get user's last activity timestamp
 */
async function getUserLastActivity(userId: string): Promise<Date | null> {
  try {
    // Get the most recent activity from various sources
    const [lastLogin, lastNotification, lastContent] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { lastLoginAt: true }
      }),
      db.notification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      db.content.findFirst({
        where: { createdBy: userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    const activities = [
      lastLogin?.lastLoginAt,
      lastNotification?.createdAt,
      lastContent?.createdAt
    ].filter(Boolean) as Date[]

    return activities.length > 0 ? new Date(Math.max(...activities.map(d => d.getTime()))) : null
  } catch (error) {
    logger.error('Error getting user last activity:', error)
    return null
  }
}

/**
 * Batch notifications for the same type and recipient
 */
export async function batchNotifications(
  notifications: PendingNotification[]
): Promise<BatchedNotification[]> {
  const batched: Map<string, BatchedNotification> = new Map()

  for (const notification of notifications) {
    const key = `${notification.recipientId}-${notification.type}-${notification.relatedId || 'general'}`
    
    if (batched.has(key)) {
      const existing = batched.get(key)!
      existing.count += 1
      existing.message = getBatchedMessage(notification.type, existing.count)
      existing.data = {
        ...existing.data,
        ...notification.data,
        individualNotifications: [
          ...(existing.data?.individualNotifications || []),
          {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            senderId: notification.senderId,
            createdAt: notification.createdAt
          }
        ]
      }
    } else {
      batched.set(key, {
        type: notification.type,
        recipientId: notification.recipientId,
        title: notification.title,
        message: notification.message,
        count: 1,
        data: {
          ...notification.data,
          individualNotifications: [{
            id: notification.id,
            title: notification.title,
            message: notification.message,
            senderId: notification.senderId,
            createdAt: notification.createdAt
          }]
        },
        relatedId: notification.relatedId,
        createdAt: notification.createdAt
      })
    }
  }

  return Array.from(batched.values())
}

/**
 * Get appropriate message for batched notifications
 */
function getBatchedMessage(type: NotificationType, count: number): string {
  switch (type) {
    case 'LIKE':
      return count === 1 ? 'Someone liked your content' : `${count} people liked your content`
    
    case 'COMMENT':
      return count === 1 ? 'Someone commented on your content' : `${count} people commented on your content`
    
    case 'SHARE':
      return count === 1 ? 'Someone shared your content' : `${count} people shared your content`
    
    case 'POLL_VOTE_CAST':
      return count === 1 ? 'Someone voted on your poll' : `${count} people voted on your poll`
    
    case 'MESSAGE_RECEIVED':
      return count === 1 ? 'You have a new message' : `You have ${count} new messages`
    
    default:
      return count === 1 ? 'You have a new notification' : `You have ${count} new notifications`
  }
}

/**
 * Filter out notifications from blocked users
 */
export async function filterBlockedUsers(
  notifications: PendingNotification[]
): Promise<PendingNotification[]> {
  try {
    const filtered: PendingNotification[] = []

    for (const notification of notifications) {
      if (!notification.senderId) {
        filtered.push(notification)
        continue
      }

      // Check if recipient has blocked the sender
      const isBlocked = await db.friendship.findFirst({
        where: {
          userId: notification.recipientId,
          friendId: notification.senderId,
          status: 'BLOCKED'
        }
      })

      if (!isBlocked) {
        filtered.push(notification)
      }
    }

    return filtered
  } catch (error) {
    logger.error('Error filtering blocked users:', error)
    return notifications // Return all if filtering fails
  }
}

/**
 * Get notification priority based on type and context
 */
export function getNotificationPriority(
  type: NotificationType,
  data?: Record<string, any>
): 'high' | 'medium' | 'low' {
  // High priority - immediate action required
  if (['FRIEND_REQUEST', 'CONTENT_INVITATION', 'POLL_CONSENSUS_REACHED', 'HANGOUT_CANCELLED'].includes(type)) {
    return 'high'
  }

  // Medium priority - social interactions
  if (['FRIEND_ACCEPTED', 'MESSAGE_RECEIVED', 'CONTENT_RSVP', 'COMMENT', 'MENTION'].includes(type)) {
    return 'medium'
  }

  // Low priority - engagement and updates
  if (['LIKE', 'SHARE', 'POLL_VOTE_CAST', 'CONTENT_UPDATE', 'CONTENT_REMINDER', 'COMMUNITY_INVITATION'].includes(type)) {
    return 'low'
  }

  return 'medium'
}

/**
 * Check if notification should be sent immediately or queued
 */
export function shouldSendImmediately(
  type: NotificationType,
  priority: 'high' | 'medium' | 'low'
): boolean {
  // Always send high priority notifications immediately
  if (priority === 'high') {
    return true
  }

  // Send medium priority notifications immediately unless it's quiet hours
  if (priority === 'medium') {
    return !isQuietHours()
  }

  // Queue low priority notifications for batching
  return false
}

/**
 * Get optimal send time for queued notifications
 */
export function getOptimalSendTime(
  type: NotificationType,
  priority: 'high' | 'medium' | 'low'
): Date {
  const now = new Date()

  // High priority - send immediately
  if (priority === 'high') {
    return now
  }

  // Medium priority - send within 5 minutes
  if (priority === 'medium') {
    return new Date(now.getTime() + 5 * 60 * 1000)
  }

  // Low priority - batch and send within 30 minutes
  return new Date(now.getTime() + 30 * 60 * 1000)
}

/**
 * Clean up old notifications to prevent database bloat
 */
export async function cleanupOldNotifications(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const result = await db.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        },
        isRead: true
      }
    })

    logger.info(`Cleaned up ${result.count} old notifications`)
    return result.count
  } catch (error) {
    logger.error('Error cleaning up old notifications:', error)
    return 0
  }
}

/**
 * Get notification statistics for analytics
 */
export async function getNotificationStats(
  userId: string,
  days: number = 7
): Promise<{
  totalSent: number
  totalRead: number
  readRate: number
  byType: Record<string, { sent: number; read: number }>
}> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const notifications = await db.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: since
        }
      },
      select: {
        type: true,
        isRead: true
      }
    })

    const stats = {
      totalSent: notifications.length,
      totalRead: notifications.filter(n => n.isRead).length,
      readRate: 0,
      byType: {} as Record<string, { sent: number; read: number }>
    }

    // Calculate read rate
    if (stats.totalSent > 0) {
      stats.readRate = stats.totalRead / stats.totalSent
    }

    // Group by type
    notifications.forEach(notification => {
      const type = notification.type
      if (!stats.byType[type]) {
        stats.byType[type] = { sent: 0, read: 0 }
      }
      stats.byType[type].sent++
      if (notification.isRead) {
        stats.byType[type].read++
      }
    })

    return stats
  } catch (error) {
    logger.error('Error getting notification stats:', error)
    return {
      totalSent: 0,
      totalRead: 0,
      readRate: 0,
      byType: {}
    }
  }
}
