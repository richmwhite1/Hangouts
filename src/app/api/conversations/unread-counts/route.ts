import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/conversations/unread-counts - Get unread counts for all conversations
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    // Get all conversations where user is a participant
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: payload.userId
          }
        }
      },
      include: {
        participants: {
          where: {
            userId: payload.userId
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
    console.error('Error fetching unread counts:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch unread counts', error.message), { status: 500 })
  }
}
