import { NextRequest, NextResponse } from 'next/server'
import { createAndSendNotification } from '@/lib/push-notifications'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, hangoutId, recipientIds, data } = body

    logger.info('📱 Sending notification:', {
      type,
      title,
      message,
      hangoutId,
      recipientCount: recipientIds?.length || 0,
      data
    })

    if (!recipientIds || recipientIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No recipients specified'
      }, { status: 400 })
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    // Send notification to each recipient
    for (const recipientId of recipientIds) {
      try {
        const { notification, pushResult } = await createAndSendNotification(
          recipientId,
          type,
          title,
          message,
          {
            hangoutId,
            ...data
          }
        )

        results.push({
          recipientId,
          notificationId: notification.id,
          pushSent: pushResult.success,
          pushError: pushResult.errors[0] || null
        })

        if (pushResult.success) {
          successCount++
        } else {
          failureCount++
        }

        logger.info(`📤 Notification sent to user ${recipientId}: ${title}`)
      } catch (error) {
        logger.error(`Failed to send notification to user ${recipientId}:`, error)
        results.push({
          recipientId,
          error: error.message
        })
        failureCount++
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      notification: {
        id: `notif_${Date.now()}`,
        type,
        title,
        message,
        hangoutId,
        recipientIds,
        data,
        createdAt: new Date().toISOString(),
        status: 'sent'
      },
      results,
      summary: {
        totalRecipients: recipientIds.length,
        successCount,
        failureCount
      },
      message: `Notification sent to ${successCount}/${recipientIds.length} recipients`
    })

  } catch (error) {
    logger.error('Notification send error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
























