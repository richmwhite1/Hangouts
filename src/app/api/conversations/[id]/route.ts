import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/conversations/[id] - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    // Get conversation with participants
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
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

    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }

    // Check if user is a participant
    const userParticipant = conversation.participants.find(p => p.userId === payload.userId)
    if (!userParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }

    return NextResponse.json(createSuccessResponse({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        avatar: conversation.avatar,
        participants: conversation.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          username: p.user.username,
          avatar: p.user.avatar,
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
          lastReadAt: p.lastReadAt?.toISOString(),
          isMuted: p.isMuted,
          isArchived: p.isArchived
        })),
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt?.toISOString()
      }
    }, 'Conversation retrieved successfully'))

  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch conversation', error.message), { status: 500 })
  }
}

// PUT /api/conversations/[id] - Update conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(createErrorResponse('Invalid name', 'Name is required'), { status: 400 })
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
    const userParticipant = conversation.participants.find(p => p.userId === payload.userId)
    if (!userParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }

    // Check if it's a group conversation
    if (conversation.type !== 'GROUP') {
      return NextResponse.json(createErrorResponse('Invalid operation', 'Can only update group conversation names'), { status: 400 })
    }

    // Update conversation name
    const updatedConversation = await db.conversation.update({
      where: { id: params.id },
      data: {
        name: name.trim()
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
    }, 'Conversation updated successfully'))

  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(createErrorResponse('Failed to update conversation', error.message), { status: 500 })
  }
}