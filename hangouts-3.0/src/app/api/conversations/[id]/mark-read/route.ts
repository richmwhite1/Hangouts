import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// POST /api/conversations/[id]/mark-read - Mark conversation as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const { id: conversationId } = await params

    // Verify user is a participant in this conversation
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id
        }
      }
    })

    if (!participant) {
      return NextResponse.json(createErrorResponse('Forbidden', 'User is not a participant in this conversation'), { status: 403 })
    }

    // Update lastReadAt to current time
    await db.conversationParticipant.update({
      where: {
        id: participant.id
      },
      data: {
        lastReadAt: new Date()
      }
    })

    // Also mark all messages in this conversation as read for this user
    const messages = await db.messages.findMany({
      where: {
        conversationId,
        isDeleted: false,
        senderId: {
          not: user.id // Don't mark own messages as read
        }
      },
      select: {
        id: true
      }
    })

    logger.info(`Marking ${messages.length} messages as read for conversation ${conversationId}`)

    // Get existing read receipts to avoid duplicates
    const existingReads = await db.message_reads.findMany({
      where: {
        userId: user.id,
        messageId: {
          in: messages.map(m => m.id)
        }
      },
      select: {
        messageId: true
      }
    })

    const existingMessageIds = new Set(existingReads.map(r => r.messageId))
    
    // Create message_reads entries only for messages that haven't been read yet
    const messageReads = messages
      .filter(message => !existingMessageIds.has(message.id))
      .map(message => ({
        messageId: message.id,
        userId: user.id,
        readAt: new Date()
      }))

    if (messageReads.length > 0) {
      const result = await db.message_reads.createMany({
        data: messageReads,
        skipDuplicates: true
      })
      logger.info(`Created ${result.count} read receipts for conversation ${conversationId}`)
    } else {
      logger.info(`All messages already marked as read for conversation ${conversationId}`)
    }

    // Mark all MESSAGE_RECEIVED notifications related to this conversation as read
    // Get all unread message notifications for this user
    const unreadMessageNotifications = await db.notification.findMany({
      where: {
        userId: user.id,
        type: 'MESSAGE_RECEIVED',
        isRead: false
      }
    })

    // Get all message IDs in this conversation to match against
    const conversationMessageIds = await db.messages.findMany({
      where: {
        conversationId,
        isDeleted: false
      },
      select: {
        id: true
      }
    })

    const messageIdSet = new Set(conversationMessageIds.map(m => m.id))
    const notificationIdsToMark: string[] = []

    // Check each notification's data field for conversationId or messageId match
    for (const notification of unreadMessageNotifications) {
      const notificationData = notification.data as any
      if (notificationData) {
        // Check if notification is for this conversation
        if (notificationData.conversationId === conversationId) {
          notificationIdsToMark.push(notification.id)
        }
        // Or if notification references a message in this conversation
        else if (notificationData.messageId && messageIdSet.has(notificationData.messageId)) {
          notificationIdsToMark.push(notification.id)
        }
      }
    }

    // Mark all matching notifications as read
    if (notificationIdsToMark.length > 0) {
      await db.notification.updateMany({
        where: {
          id: {
            in: notificationIdsToMark
          }
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
    }

    return NextResponse.json(createSuccessResponse({
      conversationId,
      readAt: new Date().toISOString()
    }, 'Conversation marked as read'))
  } catch (error) {
    logger.error('Error marking conversation as read:', error);
    return NextResponse.json(createErrorResponse('Failed to mark conversation as read', error.message), { status: 500 })
  }
}