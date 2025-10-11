import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// POST /api/conversations/[id]/participants - Add participants to conversation
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
    const { userIds, role = 'MEMBER' } = body
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(createErrorResponse('Invalid participants', 'User IDs are required'), { status: 400 })
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
    // For group conversations, check if user is admin or moderator
    if (conversation.type === 'GROUP' && !['ADMIN', 'MODERATOR'].includes(userParticipant.role)) {
      return NextResponse.json(createErrorResponse('Access denied', 'Only admins and moderators can add participants to group conversations'), { status: 403 })
    }
    // If it's a direct conversation, we'll convert it to a group
    if (conversation.type === 'DIRECT') {
      // Convert direct conversation to group
      const updatedConversation = await db.conversation.update({
        where: { id: params.id },
        data: {
          type: 'GROUP',
          name: `Group Chat` // Default name, can be changed later
        }
      })
    }
    // Add participants
    const newParticipants = await Promise.all(
      userIds.map(async (userId: string) => {
        // Check if user exists
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, username: true, avatar: true }
        })
        if (!user) {
          throw new Error(`User ${userId} not found`)
        }
        // Check if user is already a participant
        const existingParticipant = conversation.participants.find(p => p.userId === userId)
        if (existingParticipant) {
          return null // Skip existing participants
        }
        return db.conversationParticipant.create({
          data: {
            conversationId: params.id,
            userId: userId,
            role: role as 'ADMIN' | 'MODERATOR' | 'MEMBER',
            addedById: user.id
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
      })
    )
    const addedParticipants = newParticipants.filter(p => p !== null)
    return NextResponse.json(createSuccessResponse({
      participants: addedParticipants.map(p => ({
        id: p!.user.id,
        name: p!.user.name,
        username: p!.user.username,
        avatar: p!.user.avatar,
        role: p!.role,
        joinedAt: p!.joinedAt.toISOString()
      }))
    }, `${addedParticipants.length} participants added successfully`))
  } catch (error) {
    logger.error('Error adding participants:', error);
    return NextResponse.json(createErrorResponse('Failed to add participants', error.message), { status: 500 })
  }
}
// DELETE /api/conversations/[id]/participants - Remove participants from conversation
export async function DELETE(
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
    const { userIds } = body
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(createErrorResponse('Invalid participants', 'User IDs are required'), { status: 400 })
    }
    // Check if conversation exists and user has permission
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    // Check if user is admin or moderator, or removing themselves
    const userParticipant = conversation.participants.find(p => p.userId === user.id)
    const isAdminOrModerator = userParticipant && ['ADMIN', 'MODERATOR'].includes(userParticipant.role)
    const isRemovingSelf = userIds.length === 1 && userIds[0] === user.id
    if (!isAdminOrModerator && !isRemovingSelf) {
      return NextResponse.json(createErrorResponse('Access denied', 'Only admins, moderators, or the user themselves can remove participants'), { status: 403 })
    }
    // Check if it's a group conversation
    if (conversation.type !== 'GROUP') {
      return NextResponse.json(createErrorResponse('Invalid operation', 'Can only remove participants from group conversations'), { status: 400 })
    }
    // Remove participants
    const removedParticipants = await db.conversationParticipant.deleteMany({
      where: {
        conversationId: params.id,
        userId: {
          in: userIds
        }
      }
    })
    return NextResponse.json(createSuccessResponse({
      removedCount: removedParticipants.count
    }, `${removedParticipants.count} participants removed successfully`))
  } catch (error) {
    logger.error('Error removing participants:', error);
    return NextResponse.json(createErrorResponse('Failed to remove participants', error.message), { status: 500 })
  }
}
// PUT /api/conversations/[id]/participants - Update participant role
export async function PUT(
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
    const { userId, role } = body
    if (!userId || !role) {
      return NextResponse.json(createErrorResponse('Invalid data', 'User ID and role are required'), { status: 400 })
    }
    if (!['ADMIN', 'MODERATOR', 'MEMBER'].includes(role)) {
      return NextResponse.json(createErrorResponse('Invalid role', 'Role must be ADMIN, MODERATOR, or MEMBER'), { status: 400 })
    }
    // Check if conversation exists and user has permission
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    // Check if user is admin
    const userParticipant = conversation.participants.find(p => p.userId === user.id)
    if (!userParticipant || userParticipant.role !== 'ADMIN') {
      return NextResponse.json(createErrorResponse('Access denied', 'Only admins can change participant roles'), { status: 403 })
    }
    // Check if target user is a participant
    const targetParticipant = conversation.participants.find(p => p.userId === userId)
    if (!targetParticipant) {
      return NextResponse.json(createErrorResponse('Participant not found', 'User is not a participant in this conversation'), { status: 404 })
    }
    // Update participant role
    const updatedParticipant = await db.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: params.id,
          userId: userId
        }
      },
      data: { role: role as 'ADMIN' | 'MODERATOR' | 'MEMBER' },
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
      participant: {
        id: updatedParticipant.user.id,
        name: updatedParticipant.user.name,
        username: updatedParticipant.user.username,
        avatar: updatedParticipant.user.avatar,
        role: updatedParticipant.role
      }
    }, 'Participant role updated successfully'))
  } catch (error) {
    logger.error('Error updating participant role:', error);
    return NextResponse.json(createErrorResponse('Failed to update participant role', error.message), { status: 500 })
  }
}