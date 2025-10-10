import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
// POST /api/conversations/[id]/mark-read - Mark conversation as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        isDeleted: false
      },
      select: {
        id: true
      }
    })
    // Create message_reads entries for all unread messages
    const messageReads = messages.map(message => ({
      messageId: message.id,
      userId: user.id,
      readAt: new Date()
    }))
    if (messageReads.length > 0) {
      await db.message_reads.createMany({
        data: messageReads,
        skipDuplicates: true
      })
    }
    return NextResponse.json(createSuccessResponse({
      conversationId,
      readAt: new Date().toISOString()
    }, 'Conversation marked as read'))
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    return NextResponse.json(createErrorResponse('Failed to mark conversation as read', error.message), { status: 500 })
  }
}