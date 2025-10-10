import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
// POST /api/conversations/[id]/messages/read - Mark multiple messages as read
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
    const { messageIds, lastReadMessageId } = body
    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation || !conversation.participants.some(p => p.userId === user.id)) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    let messagesToMark = []
    if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      messagesToMark = messageIds
    } else if (lastReadMessageId) {
      // Mark all messages up to and including the last read message as read
      const lastMessage = await db.messages.findUnique({
        where: { id: lastReadMessageId }
      })
      if (!lastMessage || lastMessage.conversationId !== params.id) {
        return NextResponse.json(createErrorResponse('Invalid message', 'The specified message does not exist in this conversation'), { status: 400 })
      }
      const messages = await db.messages.findMany({
        where: {
          conversationId: params.id,
          createdAt: { lte: lastMessage.createdAt },
          senderId: { not: user.id } // Don't mark own messages as read
        },
        select: { id: true }
      })
      messagesToMark = messages.map(m => m.id)
    } else {
      return NextResponse.json(createErrorResponse('Invalid input', 'Either messageIds or lastReadMessageId is required'), { status: 400 })
    }
    if (messagesToMark.length === 0) {
      return NextResponse.json(createSuccessResponse({
        markedCount: 0,
        readReceipts: []
      }, 'No messages to mark as read'))
    }
    // Mark messages as read
    const readReceipts = []
    for (const messageId of messagesToMark) {
      try {
        const readReceipt = await db.message_reads.upsert({
          where: {
            messageId_userId: {
              messageId: messageId,
              userId: user.id
            }
          },
          update: {
            readAt: new Date()
          },
          create: {
            messageId: messageId,
            userId: user.id,
            readAt: new Date()
          }
        })
        readReceipts.push(readReceipt)
      } catch (error) {
        // Skip messages that don't exist or user doesn't have access to
        console.warn(`Failed to mark message ${messageId} as read:`, error.message)
      }
    }
    return NextResponse.json(createSuccessResponse({
      markedCount: readReceipts.length,
      readReceipts: readReceipts.map(receipt => ({
        id: receipt.id,
        messageId: receipt.messageId,
        userId: receipt.userId,
        readAt: receipt.readAt.toISOString()
      }))
    }, `${readReceipts.length} messages marked as read`))
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json(createErrorResponse('Failed to mark messages as read', error.message), { status: 500 })
  }
}