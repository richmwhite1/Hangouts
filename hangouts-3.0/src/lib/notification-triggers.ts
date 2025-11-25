import { db } from '@/lib/db'
import { createAndSendNotification } from '@/lib/push-notifications'
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

export interface NotificationTriggerParams {
  type: NotificationType
  recipientId: string
  title: string
  message: string
  data?: Record<string, any>
  senderId?: string
  relatedId?: string // hangoutId, eventId, etc.
}

export interface BatchNotificationParams {
  type: NotificationType
  recipientIds: string[]
  title: string
  message: string
  data?: Record<string, any>
  senderId?: string
  relatedId?: string
}

/**
 * Check if user wants to receive this type of notification
 */
async function checkNotificationPreferences(
  userId: string,
  type: NotificationType
): Promise<{ inApp: boolean; push: boolean; email: boolean }> {
  try {
    const preference = await db.notificationPreference.findUnique({
      where: {
        userId_type: {
          userId,
          type: type as any
        }
      }
    })

    if (!preference) {
      // Return default preferences if no preference exists
      const defaults = {
        FRIEND_REQUEST: { inApp: true, push: true, email: false },
        FRIEND_ACCEPTED: { inApp: true, push: true, email: false },
        MESSAGE_RECEIVED: { inApp: true, push: true, email: false },
        CONTENT_INVITATION: { inApp: true, push: true, email: false },
        CONTENT_RSVP: { inApp: true, push: true, email: false },
        CONTENT_REMINDER: { inApp: true, push: true, email: false },
        CONTENT_UPDATE: { inApp: true, push: false, email: false },
        COMMUNITY_INVITATION: { inApp: true, push: true, email: false },
        MENTION: { inApp: true, push: true, email: false },
        LIKE: { inApp: true, push: false, email: false },
        COMMENT: { inApp: true, push: true, email: false },
        SHARE: { inApp: true, push: false, email: false },
        POLL_VOTE_CAST: { inApp: true, push: false, email: false },
        POLL_CONSENSUS_REACHED: { inApp: true, push: true, email: false },
        HANGOUT_CONFIRMED: { inApp: true, push: true, email: false },
        HANGOUT_CANCELLED: { inApp: true, push: true, email: false }
      }
      return defaults[type] || { inApp: true, push: false, email: false }
    }

    return {
      inApp: preference.inAppEnabled,
      push: preference.pushEnabled,
      email: preference.emailEnabled
    }
  } catch (error) {
    logger.error('Error checking notification preferences:', error)
    return { inApp: true, push: false, email: false }
  }
}

/**
 * Check if we should send this notification (avoid duplicates, respect quiet hours, etc.)
 */
async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  relatedId?: string
): Promise<boolean> {
  try {
    // Don't send duplicate notifications within 5 minutes
    if (relatedId) {
      const recentNotification = await db.notification.findFirst({
        where: {
          userId,
          type: type as any,
          data: {
            path: ['relatedId'],
            equals: relatedId
          },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
          }
        }
      })

      if (recentNotification) {
        logger.info(`Skipping duplicate notification for user ${userId}, type ${type}`)
        return false
      }
    }

    // Check quiet hours (9pm - 8am)
    const now = new Date()
    const hour = now.getHours()
    const isQuietHours = hour >= 21 || hour < 8

    // Allow critical notifications during quiet hours
    const criticalTypes: NotificationType[] = [
      'FRIEND_REQUEST',
      'CONTENT_INVITATION',
      'MESSAGE_RECEIVED',
      'POLL_CONSENSUS_REACHED',
      'HANGOUT_CANCELLED'
    ]

    if (isQuietHours && !criticalTypes.includes(type)) {
      logger.info(`Skipping non-critical notification during quiet hours for user ${userId}`)
      return false
    }

    return true
  } catch (error) {
    logger.error('Error checking if should send notification:', error)
    return true // Default to sending if check fails
  }
}

/**
 * Create notification in database
 */
async function createNotificationRecord(params: NotificationTriggerParams): Promise<any> {
  try {
    const notification = await db.notification.create({
      data: {
        userId: params.recipientId,
        type: params.type as any,
        title: params.title,
        message: params.message,
        data: {
          senderId: params.senderId,
          relatedId: params.relatedId,
          ...params.data
        }
      }
    })

    return notification
  } catch (error) {
    logger.error('Error creating notification record:', error)
    throw error
  }
}

/**
 * Send push notification if enabled
 */
async function sendPushNotification(
  userId: string,
  params: NotificationTriggerParams,
  preferences: { inApp: boolean; push: boolean; email: boolean }
): Promise<boolean> {
  if (!preferences.push) {
    return false
  }

  try {
    const { notification, pushResult } = await createAndSendNotification(
      userId,
      params.type,
      params.title,
      params.message,
      {
        senderId: params.senderId,
        relatedId: params.relatedId,
        ...params.data
      }
    )

    return pushResult.success
  } catch (error) {
    logger.error('Error sending push notification:', error)
    return false
  }
}

/**
 * Main function to trigger a notification
 */
export async function triggerNotification(params: NotificationTriggerParams): Promise<{
  success: boolean
  notificationId?: string
  pushSent: boolean
  error?: string
}> {
  try {
    // Don't notify users about their own actions
    if (params.senderId && params.senderId === params.recipientId) {
      return { success: true, pushSent: false }
    }

    // Check if we should send this notification
    const shouldSend = await shouldSendNotification(
      params.recipientId,
      params.type,
      params.relatedId
    )

    if (!shouldSend) {
      return { success: true, pushSent: false }
    }

    // Check user preferences
    const preferences = await checkNotificationPreferences(
      params.recipientId,
      params.type
    )

    if (!preferences.inApp && !preferences.push && !preferences.email) {
      logger.info(`User ${params.recipientId} has disabled all notifications for type ${params.type}`)
      return { success: true, pushSent: false }
    }

    // Create notification record
    const notification = await createNotificationRecord(params)

    // Send push notification if enabled
    let pushSent = false
    if (preferences.push) {
      pushSent = await sendPushNotification(params.recipientId, params, preferences)
    }

    // TODO: Send email notification if enabled
    // This would be implemented with an email service like SendGrid, AWS SES, etc.

    logger.info(`Notification sent to user ${params.recipientId}: ${params.title}`)

    return {
      success: true,
      notificationId: notification.id,
      pushSent
    }

  } catch (error) {
    logger.error('Error triggering notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Trigger notifications for multiple recipients
 */
export async function triggerBatchNotifications(params: BatchNotificationParams): Promise<{
  success: boolean
  results: Array<{
    recipientId: string
    success: boolean
    notificationId?: string
    pushSent: boolean
    error?: string
  }>
}> {
  const results = []

  for (const recipientId of params.recipientIds) {
    const result = await triggerNotification({
      ...params,
      recipientId
    })

    results.push({
      recipientId,
      ...result
    })
  }

  const successCount = results.filter(r => r.success).length
  const totalCount = results.length

  return {
    success: successCount > 0,
    results
  }
}

/**
 * Helper function to get user display name for notifications
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true }
    })

    if (!user) {
      return 'Unknown User'
    }

    return user.name || user.username || 'Unknown User'
  } catch (error) {
    logger.error('Error getting user display name:', error)
    return 'Unknown User'
  }
}

/**
 * Helper function to get hangout/event title for notifications
 */
export async function getContentTitle(contentId: string): Promise<string> {
  try {
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: { title: true }
    })

    return content?.title || 'Untitled'
  } catch (error) {
    logger.error('Error getting content title:', error)
    return 'Untitled'
  }
}

/**
 * Helper function to format notification messages
 */
export function formatNotificationMessage(
  type: NotificationType,
  senderName: string,
  contentTitle?: string,
  additionalData?: any
): { title: string; message: string } {
  switch (type) {
    case 'FRIEND_REQUEST':
      return {
        title: 'New Friend Request',
        message: `${senderName} sent you a friend request`
      }
    
    case 'FRIEND_ACCEPTED':
      return {
        title: 'Friend Request Accepted',
        message: `${senderName} accepted your friend request`
      }
    
    case 'MESSAGE_RECEIVED':
      return {
        title: 'New Message',
        message: `${senderName} sent a message in ${contentTitle || 'the hangout'}`
      }
    
    case 'CONTENT_INVITATION':
      return {
        title: 'Hangout Invitation',
        message: `${senderName} invited you to "${contentTitle || 'a hangout'}"`
      }
    
    case 'CONTENT_RSVP':
      return {
        title: 'RSVP Response',
        message: `${senderName} responded to your hangout "${contentTitle || 'invitation'}"`
      }
    
    case 'CONTENT_REMINDER':
      return {
        title: 'Hangout Reminder',
        message: `Your hangout "${contentTitle || 'is coming up'}" starts soon`
      }
    
    case 'CONTENT_UPDATE':
      return {
        title: 'Hangout Updated',
        message: `"${contentTitle || 'Your hangout'}" has been updated`
      }
    
    case 'COMMUNITY_INVITATION':
      return {
        title: 'Community Invitation',
        message: `${senderName} invited you to join a community`
      }
    
    case 'MENTION':
      return {
        title: 'You were mentioned',
        message: `${senderName} mentioned you in ${contentTitle || 'a comment'}`
      }
    
    case 'LIKE':
      return {
        title: 'New Like',
        message: `${senderName} liked your ${contentTitle || 'content'}`
      }
    
    case 'COMMENT':
      return {
        title: 'New Comment',
        message: `${senderName} commented on "${contentTitle || 'your hangout'}"`
      }
    
    case 'SHARE':
      return {
        title: 'Content Shared',
        message: `${senderName} shared "${contentTitle || 'your hangout'}"`
      }
    
    case 'POLL_VOTE_CAST':
      return {
        title: 'New Vote',
        message: `${senderName} voted on your poll "${contentTitle || ''}"`
      }
    
    case 'POLL_CONSENSUS_REACHED':
      return {
        title: 'Poll Consensus Reached',
        message: `Your poll "${contentTitle || ''}" has reached consensus`
      }
    
    case 'HANGOUT_CONFIRMED':
      return {
        title: 'Hangout Confirmed',
        message: `"${contentTitle || 'Your hangout'}" is confirmed and ready to go`
      }
    
    case 'HANGOUT_CANCELLED':
      return {
        title: 'Hangout Cancelled',
        message: `"${contentTitle || 'A hangout you\'re part of'}" has been cancelled`
      }
    
    default:
      return {
        title: 'Notification',
        message: 'You have a new notification'
      }
  }
}
