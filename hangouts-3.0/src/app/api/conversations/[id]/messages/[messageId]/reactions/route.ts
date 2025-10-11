import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// POST /api/conversations/[id]/messages/[messageId]/reactions - Add or remove a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
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
    const { emoji } = body
    if (!emoji) {
      return NextResponse.json(createErrorResponse('Invalid reaction', 'Emoji is required'), { status: 400 })
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
    // Check if message exists
    const message = await db.messages.findUnique({
      where: { id: params.messageId }
    })
    if (!message || message.conversationId !== params.id) {
      return NextResponse.json(createErrorResponse('Message not found', 'The message does not exist'), { status: 404 })
    }
    // Check if reaction already exists
    const existingReaction = await db.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: params.messageId,
          userId: user.id,
          emoji: emoji
        }
      }
    })
    if (existingReaction) {
      // Remove the reaction
      await db.messageReaction.delete({
        where: { id: existingReaction.id }
      })
      return NextResponse.json(createSuccessResponse({
        action: 'removed',
        emoji: emoji
      }, 'Reaction removed successfully'))
    } else {
      // Add the reaction
      const reaction = await db.messageReaction.create({
        data: {
          messageId: params.messageId,
          userId: user.id,
          emoji: emoji
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
        }
      })
      return NextResponse.json(createSuccessResponse({
        action: 'added',
        reaction: {
          id: reaction.id,
          emoji: reaction.emoji,
          user: reaction.user,
          createdAt: reaction.createdAt.toISOString()
        }
      }, 'Reaction added successfully'))
    }
  } catch (error) {
    logger.error('Error managing reaction:', error);
    return NextResponse.json(createErrorResponse('Failed to manage reaction', error.message), { status: 500 })
  }
}
// GET /api/conversations/[id]/messages/[messageId]/reactions - Get all reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
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
    // Get all reactions for the message
    const reactions = await db.messageReaction.findMany({
      where: { messageId: params.messageId },
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
      orderBy: { createdAt: 'asc' }
    })
    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = []
      }
      acc[reaction.emoji].push({
        id: reaction.id,
        user: reaction.user,
        createdAt: reaction.createdAt.toISOString()
      })
      return acc
    }, {} as Record<string, any[]>)
    return NextResponse.json(createSuccessResponse({
      reactions: groupedReactions
    }, 'Reactions retrieved successfully'))
  } catch (error) {
    logger.error('Error fetching reactions:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch reactions', error.message), { status: 500 })
  }
}