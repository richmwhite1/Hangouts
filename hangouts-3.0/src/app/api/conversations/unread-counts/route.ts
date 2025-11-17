import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
// GET /api/conversations/unread-counts - Get unread counts for all conversations
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const clerkUser = await getClerkApiUser()
    if (!clerkUser) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'User not found'), { status: 401 })
    }

    const userId = clerkUser.id

    // Get all conversations where user is a participant
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      select: {
        id: true
      }
    })

    const conversationIds = conversations.map(c => c.id)

    if (conversationIds.length === 0) {
      logger.info(`No conversations found for user ${userId} (Clerk: ${clerkUserId})`)
      return NextResponse.json(createSuccessResponse({
        unreadCounts: [],
        totalUnreadCount: 0
      }, 'Unread counts retrieved successfully'))
    }

    // Use a more efficient query to count unread messages per conversation
    // Count messages that don't have a read receipt for this user
    const unreadCounts = await Promise.all(
      conversationIds.map(async (conversationId) => {
        try {
          // Count messages that haven't been read by this user
          // This is more efficient than counting total and subtracting read
          const unreadCount = await db.messages.count({
            where: {
              conversationId: conversationId,
              isDeleted: false,
              senderId: {
                not: userId
              },
              message_reads: {
                none: {
                  userId: userId
                }
              }
            }
          })

          if (unreadCount > 0) {
            logger.info(`Conversation ${conversationId} has ${unreadCount} unread messages for user ${userId} (Clerk: ${clerkUserId})`)
          }

          return {
            conversationId,
            unreadCount
          }
        } catch (error) {
          logger.error(`Error counting unread messages for conversation ${conversationId}:`, error)
          return {
            conversationId,
            unreadCount: 0
          }
        }
      })
    )

    // Calculate total unread count
    const totalUnreadCount = unreadCounts.reduce((sum, conv) => sum + conv.unreadCount, 0)
    
    logger.info(`Total unread count for user ${userId} (Clerk: ${clerkUserId}): ${totalUnreadCount} across ${conversations.length} conversations`)

    return NextResponse.json(createSuccessResponse({
      unreadCounts,
      totalUnreadCount
    }, 'Unread counts retrieved successfully'))

  } catch (error) {
    logger.error('Error fetching unread counts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(createErrorResponse('Failed to fetch unread counts', errorMessage), { status: 500 })
  }
}
