import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// POST /api/conversations/[id]/convert-to-group - Convert direct conversation to group
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
    const { name, participantIds } = body
    if (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(createErrorResponse('Invalid data', 'Name and participant IDs are required'), { status: 400 })
    }
    // Check if conversation exists and user has permission
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    // Check if user is a participant
    const userParticipant = conversation.participants.find(p => p.userId === user.id)
    if (!userParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Check if it's a direct conversation
    if (conversation.type !== 'DIRECT') {
      return NextResponse.json(createErrorResponse('Invalid operation', 'Can only convert direct conversations to groups'), { status: 400 })
    }
    // Check if all new participants exist
    const existingUsers = await db.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, name: true, username: true, avatar: true }
    })
    if (existingUsers.length !== participantIds.length) {
      return NextResponse.json(createErrorResponse('Invalid participants', 'Some users do not exist'), { status: 400 })
    }
    // Check for existing participants to avoid duplicates
    const existingParticipantIds = conversation.participants.map(p => p.userId)
    const newParticipantIds = participantIds.filter(id => !existingParticipantIds.includes(id))
    if (newParticipantIds.length === 0) {
      return NextResponse.json(createErrorResponse('No new participants', 'All specified users are already in the conversation'), { status: 400 })
    }
    // Convert to group conversation
    const updatedConversation = await db.conversation.update({
      where: { id: params.id },
      data: {
        type: 'GROUP',
        name: name,
        // Add new participants
        participants: {
          create: newParticipantIds.map((userId: string) => ({
            userId: userId,
            role: 'MEMBER',
            addedById: user.id
          }))
        }
      },
      include: {
        participants: {
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
        }
      }
    })
    return NextResponse.json(createSuccessResponse({
      conversation: {
        id: updatedConversation.id,
        type: updatedConversation.type,
        name: updatedConversation.name,
        participants: updatedConversation.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          username: p.user.username,
          avatar: p.user.avatar,
          role: p.role
        })),
        createdAt: updatedConversation.createdAt.toISOString(),
        updatedAt: updatedConversation.updatedAt.toISOString()
      }
    }, 'Conversation converted to group successfully'))
  } catch (error) {
    logger.error('Error converting conversation to group:', error);
    return NextResponse.json(createErrorResponse('Failed to convert conversation', error.message), { status: 500 })
  }
}