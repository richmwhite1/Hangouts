import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { z } from 'zod'

// GET /api/hangouts/[id]/messages - Get messages for a hangout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: hangoutId } = await params

    // Check if the hangout exists and user has access
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        type: true,
        privacyLevel: true,
        creatorId: true,
        content_participants: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Hangout not found', 'Hangout does not exist'), { status: 404 })
    }

    // Check if user has access to the hangout
    const hasAccess = hangout.privacyLevel === 'PUBLIC' || 
                     hangout.creatorId === user.id ||
                     hangout.content_participants.some(p => p.userId === user.id)

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You do not have access to this hangout'), { status: 403 })
    }

    // Get messages for the hangout
    const messages = await db.messages.findMany({
      where: { contentId: hangoutId },
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
      orderBy: { createdAt: 'asc' }
    })

    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      senderName: msg.users.name,
      senderId: msg.users.id,
      senderUsername: msg.users.username,
      senderAvatar: msg.users.avatar,
      createdAt: msg.createdAt.toISOString(),
      type: msg.type.toLowerCase(),
      isRead: false // TODO: Implement actual read status
    }))

    return NextResponse.json(createSuccessResponse({ messages: transformedMessages }, 'Messages retrieved successfully'))

  } catch (error: any) {
    console.error('Error fetching hangout messages:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch messages', error.message), { status: 500 })
  }
}

const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty').max(1000, 'Message content too long'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
  attachments: z.array(z.string().url()).optional()
})

// POST /api/hangouts/[id]/messages - Send a message to a hangout
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: hangoutId } = await params
    const body = await request.json()
    const { content, type, attachments } = SendMessageSchema.parse(body)

    // Check if the hangout exists and user has access
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        type: true,
        privacyLevel: true,
        creatorId: true,
        content_participants: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Hangout not found', 'Hangout does not exist'), { status: 404 })
    }

    // Check if user has access to the hangout
    const hasAccess = hangout.privacyLevel === 'PUBLIC' || 
                     hangout.creatorId === user.id ||
                     hangout.content_participants.some(p => p.userId === user.id)

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You do not have access to this hangout'), { status: 403 })
    }

    // Create the message
    const newMessage = await db.messages.create({
      data: {
        contentId: hangoutId,
        senderId: user.id,
        text: content,
        type: type,
        metadata: attachments ? { attachments } : null
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

    const transformedMessage = {
      id: newMessage.id,
      text: newMessage.text,
      senderName: newMessage.users.name,
      senderId: newMessage.users.id,
      senderUsername: newMessage.users.username,
      senderAvatar: newMessage.users.avatar,
      createdAt: newMessage.createdAt.toISOString(),
      type: newMessage.type.toLowerCase(),
      isRead: false
    }

    return NextResponse.json(createSuccessResponse({ message: transformedMessage }, 'Message sent successfully'), { status: 201 })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.errors)), { status: 400 })
    }
    console.error('Error sending hangout message:', error)
    return NextResponse.json(createErrorResponse('Failed to send message', error.message), { status: 500 })
  }
}