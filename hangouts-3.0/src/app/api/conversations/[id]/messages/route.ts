import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
// GET /api/conversations/[id]/messages - Get messages for a conversation
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
      include: {
        participants: true
      }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    const isParticipant = conversation.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    // Get messages with full details
    const messages = await db.messages.findMany({
      where: {
        conversationId: params.id,
        isDeleted: false
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
        attachments: true,
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
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.text,
      sender: {
        id: message.users.id,
        name: message.users.name,
        username: message.users.username,
        avatar: message.users.avatar
      },
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      type: message.type,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      replyTo: message.messages ? {
        id: message.messages.id,
        content: message.messages.text,
        sender: message.messages.users
      } : null,
      reactions: message.reactions.map(reaction => ({
        emoji: reaction.emoji,
        user: reaction.user,
        createdAt: reaction.createdAt.toISOString()
      })),
      attachments: message.attachments.map(attachment => ({
        id: attachment.id,
        type: attachment.type,
        url: attachment.url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        thumbnailUrl: attachment.thumbnailUrl
      }))
    }))
    return NextResponse.json(createSuccessResponse({
      messages: transformedMessages
    }, 'Messages retrieved successfully'))
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch messages', error.message), { status: 500 })
  }
}
// POST /api/conversations/[id]/messages - Send a message
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
    const { content, type = 'TEXT', replyToId, attachments = [] } = body
    if (!content || content.trim().length === 0) {
      return NextResponse.json(createErrorResponse('Invalid message', 'Message content is required'), { status: 400 })
    }
    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: {
        participants: true
      }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    const isParticipant = conversation.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Create message with attachments
    const message = await db.messages.create({
      data: {
        conversationId: params.id,
        senderId: user.id,
        text: content.trim(),
        type: type as 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT' | 'STICKER' | 'GIF',
        replyToId: replyToId || null,
        attachments: {
          create: attachments.map((attachment: any) => ({
            type: attachment.type,
            url: attachment.url,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            thumbnailUrl: attachment.thumbnailUrl,
            metadata: attachment.metadata
          }))
        }
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
    // Update conversation's lastMessageAt
    await db.conversation.update({
      where: { id: params.id },
      data: { lastMessageAt: new Date() }
    })
    return NextResponse.json(createSuccessResponse({
      message: {
        id: message.id,
        content: message.text,
        sender: {
          id: message.users.id,
          name: message.users.name,
          username: message.users.username,
          avatar: message.users.avatar
        },
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        type: message.type,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        replyTo: message.messages ? {
          id: message.messages.id,
          content: message.messages.text,
          sender: message.messages.users
        } : null,
        reactions: message.reactions.map(reaction => ({
          emoji: reaction.emoji,
          user: reaction.user,
          createdAt: reaction.createdAt.toISOString()
        })),
        attachments: message.attachments.map(attachment => ({
          id: attachment.id,
          type: attachment.type,
          url: attachment.url,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          thumbnailUrl: attachment.thumbnailUrl
        }))
      }
    }, 'Message sent successfully'))
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(createErrorResponse('Failed to send message', error.message), { status: 500 })
  }
}