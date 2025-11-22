import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: userId } = await params

    // Only allow users to view their own highlights
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all hangouts user participated in
    const hangouts = await db.content.findMany({
      where: {
        OR: [
          {
            userId: userId,
            type: 'HANGOUT',
            status: { in: ['PUBLISHED', 'ACTIVE'] }
          },
          {
            content_participants: {
              some: {
                userId: userId,
                content: {
                  type: 'HANGOUT',
                  status: { in: ['PUBLISHED', 'ACTIVE'] }
                }
              }
            }
          }
        ]
      },
      include: {
        content_participants: {
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
        photos: {
          select: {
            id: true,
            url: true
          },
          take: 1
        },
        _count: {
          select: {
            photos: true,
            comments: true,
            content_participants: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 50 // Limit for performance
    })

    // Find most memorable hangout (most photos + comments)
    const mostMemorableHangout = hangouts
      .map(h => ({
        ...h,
        engagementScore: (h._count.photos * 2) + h._count.comments + h._count.content_participants
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)[0] || null

    // Find favorite location (most visited)
    const locationCounts = new Map<string, { count: number; hangout: any }>()
    hangouts.forEach(hangout => {
      if (hangout.location) {
        const existing = locationCounts.get(hangout.location) || { count: 0, hangout }
        existing.count++
        locationCounts.set(hangout.location, existing)
      }
    })

    const favoriteLocation = Array.from(locationCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)[0]?.[1] || null

    // Find strongest connection (most hangouts with same person)
    const partnerCounts = new Map<string, { count: number; user: any; hangouts: any[] }>()
    
    hangouts.forEach(hangout => {
      hangout.content_participants.forEach(participant => {
        if (participant.userId !== userId) {
          const existing = partnerCounts.get(participant.userId) || {
            count: 0,
            user: participant.user,
            hangouts: []
          }
          existing.count++
          existing.hangouts.push(hangout)
          partnerCounts.set(participant.userId, existing)
        }
      })
    })

    const strongestConnection = Array.from(partnerCounts.values())
      .sort((a, b) => b.count - a.count)[0] || null

    // Find milestone hangouts (10th, 25th, 50th, 100th)
    const milestones = []
    const sortedHangouts = [...hangouts].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    
    const milestoneNumbers = [10, 25, 50, 100]
    milestoneNumbers.forEach(num => {
      if (sortedHangouts.length >= num) {
        milestones.push({
          number: num,
          hangout: sortedHangouts[num - 1]
        })
      }
    })

    const highlights = {
      mostMemorableHangout: mostMemorableHangout ? {
        id: mostMemorableHangout.id,
        title: mostMemorableHangout.title,
        location: mostMemorableHangout.location,
        startTime: mostMemorableHangout.startTime,
        image: mostMemorableHangout.image || mostMemorableHangout.photos[0]?.url,
        photoCount: mostMemorableHangout._count.photos,
        commentCount: mostMemorableHangout._count.comments,
        participantCount: mostMemorableHangout._count.content_participants,
        engagementScore: mostMemorableHangout.engagementScore
      } : null,
      favoriteLocation: favoriteLocation ? {
        location: favoriteLocation.hangout.location,
        visitCount: favoriteLocation.count,
        lastVisit: favoriteLocation.hangout.startTime,
        image: favoriteLocation.hangout.image
      } : null,
      strongestConnection: strongestConnection ? {
        user: strongestConnection.user,
        hangoutCount: strongestConnection.count,
        firstHangout: strongestConnection.hangouts[strongestConnection.hangouts.length - 1]?.startTime,
        lastHangout: strongestConnection.hangouts[0]?.startTime
      } : null,
      milestones: milestones.map(m => ({
        number: m.number,
        hangout: {
          id: m.hangout.id,
          title: m.hangout.title,
          startTime: m.hangout.startTime,
          image: m.hangout.image
        }
      }))
    }

    return NextResponse.json(createSuccessResponse({ highlights }, 'Highlights retrieved successfully'))
  } catch (error: any) {
    logger.error('Error fetching user highlights:', error)
    return NextResponse.json(
      createErrorResponse(
        'Failed to fetch highlights',
        error?.message || 'Unknown error'
      ),
      { status: 500 }
    )
  }
}

