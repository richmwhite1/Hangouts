import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    const hangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        creatorId: userId
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        content_participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedHangouts = hangouts.map(hangout => ({
      id: hangout.id,
      title: hangout.title,
      description: hangout.description,
      activity: hangout.title,
      location: hangout.location || '',
      date: hangout.startTime?.toISOString().split('T')[0] || '',
      time: hangout.startTime?.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }) || '',
      image: hangout.image,
      participants: hangout.content_participants.map(p => ({
        id: p.user.id,
        name: p.user.name,
        username: p.user.username,
        avatar: p.user.avatar
      })),
      photos: [], // Will be fetched separately if needed
      polls: [], // Will be fetched separately if needed
      creator: hangout.users,
      createdAt: hangout.createdAt.toISOString()
    }))

    return NextResponse.json(createSuccessResponse({ hangouts: transformedHangouts }, 'User hangouts retrieved successfully'))

  } catch (error: any) {
    logger.error('Error fetching user hangouts:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch user hangouts', error.message), { status: 500 })
  }
}

