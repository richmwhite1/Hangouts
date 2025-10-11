import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// POST /api/conversations/[id]/messages/[messageId]/read - Mark message as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, messageId: string } }
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
    if (!conversation || !conversation.participants.some(p => p.userId === user.id)) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Check if message exists and belongs to this conversation
    const message = await db.messages.findUnique({
      where: { id: params.messageId }
    })
    if (!message || message.conversationId !== params.id) {
      return NextResponse.json(createErrorResponse('Message not found', 'The message does not exist in this conversation'), { status: 404 })
    }
    // Mark message as read (upsert to handle duplicate reads)
    const readReceipt = await db.message_reads.upsert({
      where: {
        messageId_userId: {
          messageId: params.messageId,
          userId: user.id
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        messageId: params.messageId,
        userId: user.id,
        readAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })
    return NextResponse.json(createSuccessResponse({
      readReceipt: {
        id: readReceipt.id,
        messageId: readReceipt.messageId,
        userId: readReceipt.userId,
        readAt: readReceipt.readAt.toISOString(),
        user: readReceipt.users
      }
    }, 'Message marked as read'))
  } catch (error) {
    logger.error('Error marking message as read:', error);
    return NextResponse.json(createErrorResponse('Failed to mark message as read', error.message), { status: 500 })
  }
}
// GET /api/conversations/[id]/messages/[messageId]/read - Get read receipts for a message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, messageId: string } }
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
    if (!conversation || !conversation.participants.some(p => p.userId === user.id)) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Get read receipts for the message
    const readReceipts = await db.message_reads.findMany({
      where: { messageId: params.messageId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { readAt: 'asc' }
    })
    return NextResponse.json(createSuccessResponse({
      readReceipts: readReceipts.map(receipt => ({
        id: receipt.id,
        messageId: receipt.messageId,
        userId: receipt.userId,
        readAt: receipt.readAt.toISOString(),
        user: receipt.users
      }))
    }, 'Read receipts retrieved successfully'))
  } catch (error) {
    logger.error('Error getting read receipts:', error);
    return NextResponse.json(createErrorResponse('Failed to get read receipts', error.message), { status: 500 })
  }
}