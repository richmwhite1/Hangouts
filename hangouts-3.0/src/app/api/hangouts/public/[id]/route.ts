import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    logger.info('Public hangout API: Fetching hangout', { hangoutId: id })

    const hangout = await db.content.findUnique({
      where: {
        id: id,
        type: 'HANGOUT',
        status: { in: ['PUBLISHED', 'DRAFT'] },
        privacyLevel: 'PUBLIC'
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        image: true,
        privacyLevel: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        content_participants: {
          select: {
            id: true,
            userId: true,
            role: true,
            canEdit: true,
            isMandatory: true,
            isCoHost: true,
            invitedAt: true,
            joinedAt: true,
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        rsvps: {
          select: {
            userId: true,
            status: true,
            respondedAt: true,
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            content_participants: true
          }
        }
      }
    })

    if (!hangout) {
      logger.warn('Public hangout API: Hangout not found or not public', { hangoutId: id })
      return NextResponse.json({
        success: false,
        error: 'Hangout not found or not public'
      }, { status: 404 })
    }

    // Transform the data to match the expected format
    const transformedHangout = {
      id: hangout.id,
      title: hangout.title,
      description: hangout.description,
      location: hangout.location,
      startTime: hangout.startTime,
      endTime: hangout.endTime,
      image: hangout.image,
      privacyLevel: hangout.privacyLevel,
      createdAt: hangout.createdAt,
      updatedAt: hangout.updatedAt,
      creator: {
        id: hangout.users?.id,
        name: hangout.users?.name || 'Unknown',
        username: hangout.users?.username || 'unknown',
        avatar: hangout.users?.avatar
      },
      participants: hangout.content_participants.map(participant => {
        // Find the corresponding RSVP for this participant
        const rsvp = hangout.rsvps.find(r => r.userId === participant.userId)
        
        return {
          id: participant.id,
          userId: participant.userId,
          role: participant.role,
          canEdit: participant.canEdit,
          isMandatory: participant.isMandatory,
          isCoHost: participant.isCoHost,
          invitedAt: participant.invitedAt,
          joinedAt: participant.joinedAt,
          rsvpStatus: rsvp?.status || 'PENDING',
          respondedAt: rsvp?.respondedAt,
          user: {
            id: participant.users?.id,
            name: participant.users?.name || 'Unknown',
            username: participant.users?.username || 'unknown',
            avatar: participant.users?.avatar
          }
        }
      }),
      _count: {
        participants: hangout._count.content_participants
      }
    }

    logger.info('Public hangout API: Successfully fetched hangout', { hangoutId: id })

    return NextResponse.json({
      success: true,
      hangout: transformedHangout
    })

  } catch (error) {
    logger.error('Public hangout API: Error fetching hangout', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch hangout'
    }, { status: 500 })
  }
}