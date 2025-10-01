import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// PUT /api/conversations/[id]/messages/[messageId] - Edit a message
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
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
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(createErrorResponse('Invalid message', 'Message content is required'), { status: 400 })
    }

    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })

    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }

    const isParticipant = conversation.participants.some(p => p.userId === payload.userId)
    if (!isParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }

    // Check if message exists and belongs to the user
    const message = await db.messages.findUnique({
      where: { id: params.messageId }
    })

    if (!message || message.conversationId !== params.id) {
      return NextResponse.json(createErrorResponse('Message not found', 'The message does not exist'), { status: 404 })
    }

    if (message.senderId !== payload.userId) {
      return NextResponse.json(createErrorResponse('Access denied', 'You can only edit your own messages'), { status: 403 })
    }

    if (message.isDeleted) {
      return NextResponse.json(createErrorResponse('Message deleted', 'Cannot edit deleted messages'), { status: 400 })
    }

    // Update the message
    const updatedMessage = await db.messages.update({
      where: { id: params.messageId },
      data: {
        text: content.trim(),
        isEdited: true,
        editedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        attachments: true,
        reactions: {
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
        },
        messages: {
          select: {
            id: true,
            text: true,
            users: {
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
      message: {
        id: updatedMessage.id,
        content: updatedMessage.text,
        sender: {
          id: updatedMessage.users.id,
          name: updatedMessage.users.name,
          username: updatedMessage.users.username,
          avatar: updatedMessage.users.avatar
        },
        createdAt: updatedMessage.createdAt.toISOString(),
        updatedAt: updatedMessage.updatedAt.toISOString(),
        editedAt: updatedMessage.editedAt?.toISOString(),
        type: updatedMessage.type,
        isEdited: updatedMessage.isEdited,
        isDeleted: updatedMessage.isDeleted,
        replyTo: updatedMessage.messages ? {
          id: updatedMessage.messages.id,
          content: updatedMessage.messages.text,
          sender: updatedMessage.messages.users
        } : null,
        reactions: updatedMessage.reactions.map(reaction => ({
          emoji: reaction.emoji,
          user: reaction.user,
          createdAt: reaction.createdAt.toISOString()
        })),
        attachments: updatedMessage.attachments.map(attachment => ({
          id: attachment.id,
          type: attachment.type,
          url: attachment.url,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          thumbnailUrl: attachment.thumbnailUrl
        }))
      }
    }, 'Message updated successfully'))

  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json(createErrorResponse('Failed to update message', error.message), { status: 500 })
  }
}

// DELETE /api/conversations/[id]/messages/[messageId] - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
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

    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })

    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }

    const isParticipant = conversation.participants.some(p => p.userId === payload.userId)
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

    // Check if user can delete the message (own message or admin)
    const userParticipant = conversation.participants.find(p => p.userId === payload.userId)
    const canDelete = message.senderId === payload.userId || userParticipant?.role === 'ADMIN'

    if (!canDelete) {
      return NextResponse.json(createErrorResponse('Access denied', 'You can only delete your own messages or be an admin'), { status: 403 })
    }

    if (message.isDeleted) {
      return NextResponse.json(createErrorResponse('Message already deleted', 'The message is already deleted'), { status: 400 })
    }

    // Soft delete the message
    const deletedMessage = await db.messages.update({
      where: { id: params.messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        text: 'This message was deleted'
      }
    })

    return NextResponse.json(createSuccessResponse({
      message: {
        id: deletedMessage.id,
        isDeleted: deletedMessage.isDeleted,
        deletedAt: deletedMessage.deletedAt?.toISOString()
      }
    }, 'Message deleted successfully'))

  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(createErrorResponse('Failed to delete message', error.message), { status: 500 })
  }
}
