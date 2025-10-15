import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Hangout ID is required'
      }, { status: 400 })
    }

    // Fetch hangout details - only public hangouts for non-authenticated users
    const hangout = await db.content.findUnique({
      where: {
        id: id,
        type: 'HANGOUT',
        privacyLevel: 'PUBLIC' // Only allow public hangouts
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        maxParticipants: true,
        weatherEnabled: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
            isActive: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                lastSeen: true,
                isActive: true
              }
            }
          }
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json({
        success: false,
        error: 'Hangout not found or not public'
      }, { status: 404 })
    }

    // Transform the data to match expected format
    const transformedHangout = {
      ...hangout,
      creator: hangout.users,
      participants: hangout.content_participants.map(participant => ({
        id: participant.id,
        user: participant.users,
        rsvpStatus: participant.role === 'HOST' ? 'YES' : 'PENDING'
      }))
    }

    return NextResponse.json({
      success: true,
      hangout: transformedHangout
    })

  } catch (error) {
    logger.error('Error fetching public hangout:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch hangout'
    }, { status: 500 })
  }
}
