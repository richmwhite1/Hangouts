import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// GET /api/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    // Get conversations where user is a participant
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: user.id
          }
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
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })
    const transformedConversations = conversations.map(conv => {
      const otherParticipants = conv.participants
        .filter(p => p.userId !== user.id)
        .map(p => p.user)
      return {
        id: conv.id,
        type: conv.type,
        name: conv.name || (conv.type === 'DIRECT' ? otherParticipants[0]?.name : 'Group Chat'),
        avatar: conv.avatar, // Include conversation avatar
        participants: conv.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          username: p.user.username,
          avatar: p.user.avatar
        })),
        lastMessage: conv.messages[0] ? {
          content: conv.messages[0].text,
          sender: conv.messages[0].users.name || conv.messages[0].users.username,
          timestamp: conv.messages[0].createdAt.toISOString()
        } : null,
        unreadCount: 0, // TODO: Implement unread count
        isOnline: otherParticipants.some(p => p.isActive) || false,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString()
      }
    })
    return NextResponse.json({
      success: true,
      conversations: transformedConversations
    })
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    const body = await request.json()
    const { type = 'DIRECT', participantIds, name } = body
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 })
    }
    // Check if direct conversation already exists between these users
    if (type === 'DIRECT' && participantIds.length === 1) {
      const existingConversation = await db.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: {
                in: [user.id, participantIds[0]]
              }
            }
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
      if (existingConversation) {
        // Generate name for existing direct conversations
        const otherParticipant = existingConversation.participants.find(p => p.userId !== user.id)
        const conversationName = existingConversation.type === 'DIRECT' && otherParticipant
          ? otherParticipant.user?.name || 'Unknown User'
          : existingConversation.name
        return NextResponse.json({
          success: true,
          conversation: {
            id: existingConversation.id,
            type: existingConversation.type,
            name: conversationName,
            participants: existingConversation.participants.map(p => ({
              id: p.user.id,
              name: p.user.name,
              username: p.user.username,
              avatar: p.user.avatar
            })),
            createdAt: existingConversation.createdAt.toISOString()
          }
        })
      }
    }
    // Create conversation
    const conversation = await db.conversation.create({
      data: {
        type: type as 'DIRECT' | 'GROUP',
        name: type === 'GROUP' ? name : null,
        createdById: user.id,
        participants: {
          create: [
            { userId: user.id, role: 'ADMIN' },
            ...participantIds.map((id: string) => ({ userId: id, role: 'MEMBER' }))
          ]
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
    // Generate name for direct conversations
    const otherParticipant = conversation.participants.find(p => p.userId !== user.id)
    const conversationName = conversation.type === 'DIRECT' && otherParticipant
      ? otherParticipant.user?.name || 'Unknown User'
      : conversation.name
    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversationName,
        participants: conversation.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          username: p.user.username,
          avatar: p.user.avatar
        })),
        createdAt: conversation.createdAt.toISOString()
      }
    })
  } catch (error) {
    logger.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
}