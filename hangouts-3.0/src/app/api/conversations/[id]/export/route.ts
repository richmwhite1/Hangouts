import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// GET /api/conversations/[id]/export - Export conversation messages
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
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    // Check if user is a participant in the conversation
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
    if (!conversation || !conversation.participants.some(p => p.userId === user.id)) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }
    // Get messages
    const messages = await db.messages.findMany({
      where: {
        conversationId: params.id,
        isDeleted: false,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
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
        message_reads: {
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
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    // Prepare export data
    const exportData = {
      conversation: {
        id: conversation.id,
        name: conversation.name,
        type: conversation.type,
        createdAt: conversation.createdAt.toISOString(),
        participants: conversation.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          username: p.user.username,
          avatar: p.user.avatar,
          role: p.role
        }))
      },
      messages: messages.map(message => ({
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
        editedAt: message.editedAt?.toISOString(),
        reactions: message.reactions.map(reaction => ({
          emoji: reaction.emoji,
          user: {
            id: reaction.user.id,
            name: reaction.user.name,
            username: reaction.user.username,
            avatar: reaction.user.avatar
          },
          createdAt: reaction.createdAt.toISOString()
        })),
        attachments: message.attachments.map(attachment => ({
          id: attachment.id,
          type: attachment.type,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          url: attachment.url
        })),
        readReceipts: message.message_reads.map(read => ({
          user: {
            id: read.users.id,
            name: read.users.name,
            username: read.users.username,
            avatar: read.users.avatar
          },
          readAt: read.readAt.toISOString()
        }))
      })),
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.id,
        totalMessages: messages.length,
        dateRange: {
          start: startDate || messages[0]?.createdAt.toISOString(),
          end: endDate || messages[messages.length - 1]?.createdAt.toISOString()
        }
      }
    }
    if (format === 'json') {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="conversation-${conversation.name || conversation.id}-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    } else if (format === 'txt') {
      // Generate plain text export
      let textContent = `Conversation Export: ${conversation.name || 'Direct Message'}\n`
      textContent += `Exported on: ${new Date().toISOString()}\n`
      textContent += `Total Messages: ${messages.length}\n\n`
      textContent += `Participants:\n`
      conversation.participants.forEach(p => {
        textContent += `- ${p.user.name} (@${p.user.username})\n`
      })
      textContent += `\n--- Messages ---\n\n`
      messages.forEach(message => {
        const timestamp = new Date(message.createdAt).toLocaleString()
        textContent += `[${timestamp}] ${message.users.name}: ${message.text}\n`
        if (message.reactions.length > 0) {
          const reactions = message.reactions.map(r => `${r.emoji} (${r.user.name})`).join(', ')
          textContent += `  Reactions: ${reactions}\n`
        }
        if (message.attachments.length > 0) {
          const attachments = message.attachments.map(a => a.filename).join(', ')
          textContent += `  Attachments: ${attachments}\n`
        }
        textContent += `\n`
      })
      return new NextResponse(textContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="conversation-${conversation.name || conversation.id}-${new Date().toISOString().split('T')[0]}.txt"`
        }
      })
    } else {
      return NextResponse.json(createErrorResponse('Invalid format', 'Supported formats: json, txt'), { status: 400 })
    }
  } catch (error) {
    logger.error('Error exporting conversation:', error);
    return NextResponse.json(createErrorResponse('Failed to export conversation', error.message), { status: 500 })
  }
}