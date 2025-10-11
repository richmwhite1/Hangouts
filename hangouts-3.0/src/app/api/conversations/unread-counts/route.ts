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
        participants: {
          where: {
            userId: userId
          },
          select: {
            lastReadAt: true
          }
        },
        messages: {
          where: {
            isDeleted: false
          },
          select: {
            id: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    // Calculate unread counts for each conversation
    const unreadCounts = conversations.map(conv => {
      const participant = conv.participants[0]
      const lastReadAt = participant?.lastReadAt
      
      // Count messages after lastReadAt
      const unreadCount = lastReadAt 
        ? conv.messages.filter(msg => msg.createdAt > lastReadAt).length
        : conv.messages.length

      return {
        conversationId: conv.id,
        unreadCount: Math.max(0, unreadCount)
      }
    })

    // Calculate total unread count
    const totalUnreadCount = unreadCounts.reduce((sum, conv) => sum + conv.unreadCount, 0)

    return NextResponse.json(createSuccessResponse({
      unreadCounts,
      totalUnreadCount
    }, 'Unread counts retrieved successfully'))

  } catch (error) {
    logger.error('Error fetching unread counts:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch unread counts', error.message), { status: 500 })
  }
}
