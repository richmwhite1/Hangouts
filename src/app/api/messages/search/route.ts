import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/messages/search - Search messages across conversations
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(createErrorResponse('Invalid input', 'Search query is required'), { status: 400 })
    }

    // Build search conditions
    const whereConditions: any = {
      isDeleted: false,
      text: {
        contains: query,
        mode: 'insensitive'
      }
    }

    // If searching within a specific conversation
    if (conversationId) {
      whereConditions.conversationId = conversationId
    } else {
      // If searching across all conversations, ensure user is a participant
      whereConditions.conversation = {
        participants: {
          some: {
            userId: payload.userId
          }
        }
      }
    }

    // Search messages
    const messages = await db.messages.findMany({
      where: whereConditions,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        conversation: {
          select: {
            id: true,
            name: true,
            type: true,
            participants: {
              select: {
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
        attachments: true
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    // Transform results
    const searchResults = messages.map(message => ({
      id: message.id,
      content: message.text,
      sender: message.users,
      conversation: {
        id: message.conversation.id,
        name: message.conversation.name,
        type: message.conversation.type,
        participants: message.conversation.participants.map(p => p.user)
      },
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      type: message.type,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
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
      })),
      // Highlight search terms
      highlightedContent: message.text.replace(
        new RegExp(`(${query})`, 'gi'),
        '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>'
      )
    }))

    // Get total count for pagination
    const totalCount = await db.messages.count({
      where: whereConditions
    })

    return NextResponse.json(createSuccessResponse({
      results: searchResults,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      query: query
    }, 'Search completed successfully'))

  } catch (error) {
    console.error('Error searching messages:', error)
    return NextResponse.json(createErrorResponse('Failed to search messages', error.message), { status: 500 })
  }
}
