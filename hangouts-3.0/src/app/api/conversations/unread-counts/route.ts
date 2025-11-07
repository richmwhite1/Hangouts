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
      include: {
        messages: {
          where: {
            isDeleted: false,
            senderId: {
              not: userId // Don't count user's own messages as unread
            }
          },
          select: {
            id: true,
            createdAt: true,
            message_reads: {
              where: {
                userId: userId
              },
              select: {
                id: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    // Calculate unread counts for each conversation
    // A message is unread if it doesn't have a message_reads entry for this user
    const unreadCounts = conversations.map(conv => {
      // Count messages that don't have a read receipt for this user
      const unreadCount = conv.messages.filter(msg => msg.message_reads.length === 0).length

      if (unreadCount > 0) {
        logger.info(`Conversation ${conv.id} has ${unreadCount} unread messages for user ${userId} (Clerk: ${clerkUserId})`)
      }

      return {
        conversationId: conv.id,
        unreadCount: Math.max(0, unreadCount)
      }
    })

    // Calculate total unread count
    const totalUnreadCount = unreadCounts.reduce((sum, conv) => sum + conv.unreadCount, 0)
    
    logger.info(`Total unread count for user ${userId} (Clerk: ${clerkUserId}): ${totalUnreadCount} across ${conversations.length} conversations`)

    return NextResponse.json(createSuccessResponse({
      unreadCounts,
      totalUnreadCount
    }, 'Unread counts retrieved successfully'))

  } catch (error) {
    logger.error('Error fetching unread counts:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch unread counts', error.message), { status: 500 })
  }
}
