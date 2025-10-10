import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
// POST /api/conversations/[id]/typing - Set typing indicator
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const body = await request.json()
    const { isTyping = true } = body
    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    const isParticipant = conversation.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    if (isTyping) {
      // Create or update typing indicator
      const expiresAt = new Date(Date.now() + 10000) // 10 seconds from now
      await db.typingIndicator.upsert({
        where: {
          conversationId_userId: {
            conversationId: params.id,
            userId: user.id
          }
        },
        update: {
          startedAt: new Date(),
          expiresAt: expiresAt
        },
        create: {
          conversationId: params.id,
          userId: user.id,
          startedAt: new Date(),
          expiresAt: expiresAt
        }
      })
    } else {
      // Remove typing indicator
      await db.typingIndicator.deleteMany({
        where: {
          conversationId: params.id,
          userId: user.id
        }
      })
    }
    return NextResponse.json(createSuccessResponse({
      isTyping: isTyping,
      userId: user.id,
      conversationId: params.id
    }, isTyping ? 'Typing indicator set' : 'Typing indicator removed'))
  } catch (error) {
    console.error('Error managing typing indicator:', error)
    return NextResponse.json(createErrorResponse('Failed to manage typing indicator', error.message), { status: 500 })
  }
}
// GET /api/conversations/[id]/typing - Get current typing indicators
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    const isParticipant = conversation.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Get active typing indicators (not expired)
    const typingIndicators = await db.typingIndicator.findMany({
      where: {
        conversationId: params.id,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })
    // Clean up expired indicators
    await db.typingIndicator.deleteMany({
      where: {
        expiresAt: {
          lte: new Date()
        }
      }
    })
    return NextResponse.json(createSuccessResponse({
      typingUsers: typingIndicators.map(indicator => ({
        user: indicator.user,
        startedAt: indicator.startedAt.toISOString()
      }))
    }, 'Typing indicators retrieved successfully'))
  } catch (error) {
    console.error('Error fetching typing indicators:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch typing indicators', error.message), { status: 500 })
  }
}