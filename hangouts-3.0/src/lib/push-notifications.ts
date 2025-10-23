import webpush from 'web-push'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:your-email@example.com'

if (!vapidPublicKey || !vapidPrivateKey) {
  logger.error('VAPID keys not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.')
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export interface PushNotificationPayload {
  title: string
  message: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  silent?: boolean
}

export interface PushNotificationResult {
  success: boolean
  sentCount: number
  failedCount: number
  errors: string[]
}

/**
 * Send push notification to a single user
 */
export async function sendPushNotification(
  userId: string, 
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  try {
    // Check if user has push notifications enabled
    const preferences = await db.notificationPreference.findFirst({
      where: { 
        userId,
        pushEnabled: true
      }
    })

    if (!preferences) {
      logger.info(`User ${userId} has push notifications disabled`)
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['User has push notifications disabled']
      }
    }

    // Get user's push subscriptions
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId }
    })

    if (subscriptions.length === 0) {
      logger.info(`No push subscriptions found for user ${userId}`)
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No push subscriptions found']
      }
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          }

          await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
          logger.info(`Push notification sent to user ${userId} via subscription ${subscription.id}`)
          return { success: true, subscriptionId: subscription.id }
        } catch (error: any) {
          logger.error(`Failed to send push notification to subscription ${subscription.id}:`, error)
          
          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410) {
            await db.pushSubscription.delete({
              where: { id: subscription.id }
            })
            logger.info(`Removed invalid push subscription ${subscription.id}`)
          }
          
          return { success: false, subscriptionId: subscription.id, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful
    const errors = results
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
      .map(r => r.status === 'rejected' ? r.reason : r.value.error)

    return {
      success: successful > 0,
      sentCount: successful,
      failedCount: failed,
      errors
    }

  } catch (error) {
    logger.error('Error in sendPushNotification:', error)
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error.message]
    }
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendBulkPushNotifications(
  userIds: string[], 
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  try {
    const results = await Promise.allSettled(
      userIds.map(userId => sendPushNotification(userId, payload))
    )

    let totalSent = 0
    let totalFailed = 0
    const allErrors: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        totalSent += result.value.sentCount
        totalFailed += result.value.failedCount
        allErrors.push(...result.value.errors)
      } else {
        totalFailed++
        allErrors.push(`User ${userIds[index]}: ${result.reason}`)
      }
    })

    return {
      success: totalSent > 0,
      sentCount: totalSent,
      failedCount: totalFailed,
      errors: allErrors
    }

  } catch (error) {
    logger.error('Error in sendBulkPushNotifications:', error)
    return {
      success: false,
      sentCount: 0,
      failedCount: userIds.length,
      errors: [error.message]
    }
  }
}

/**
 * Check if user has push notifications enabled for a specific type
 */
export async function checkNotificationPreferences(
  userId: string, 
  type: string
): Promise<boolean> {
  try {
    const preference = await db.notificationPreference.findFirst({
      where: { 
        userId,
        type: type as any,
        pushEnabled: true
      }
    })

    return !!preference
  } catch (error) {
    logger.error('Error checking notification preferences:', error)
    return false
  }
}

/**
 * Create notification in database and send push notification
 */
export async function createAndSendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<{ notification: any; pushResult: PushNotificationResult }> {
  try {
    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data: data || null,
        isPushSent: false
      }
    })

    // Check if user wants push notifications for this type
    const pushEnabled = await checkNotificationPreferences(userId, type)
    
    let pushResult: PushNotificationResult = {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: ['Push notifications disabled for this type']
    }

    if (pushEnabled) {
      const payload: PushNotificationPayload = {
        title,
        message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `${type}-${notification.id}`,
        data: {
          type,
          notificationId: notification.id,
          ...data
        },
        requireInteraction: false,
        silent: false
      }

      pushResult = await sendPushNotification(userId, payload)
    }

    // Update notification with push status
    await db.notification.update({
      where: { id: notification.id },
      data: { isPushSent: pushResult.success }
    })

    return { notification, pushResult }

  } catch (error) {
    logger.error('Error creating and sending notification:', error)
    throw error
  }
}

/**
 * Clean up invalid push subscriptions
 */
export async function cleanupInvalidSubscriptions(): Promise<number> {
  try {
    // This would typically be run as a background job
    // For now, we'll just return 0 as cleanup happens during send attempts
    return 0
  } catch (error) {
    logger.error('Error cleaning up invalid subscriptions:', error)
    return 0
  }
}
