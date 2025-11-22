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

    // Only allow users to view their own insights
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current date boundaries
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get hangouts this month
    const hangoutsThisMonth = await db.content.count({
      where: {
        OR: [
          {
            userId: userId,
            type: 'HANGOUT',
            status: { in: ['PUBLISHED', 'ACTIVE'] },
            startTime: { gte: startOfMonth }
          },
          {
            content_participants: {
              some: {
                userId: userId,
                content: {
                  type: 'HANGOUT',
                  status: { in: ['PUBLISHED', 'ACTIVE'] },
                  startTime: { gte: startOfMonth }
                }
              }
            }
          }
        ]
      }
    })

    // Get hangouts last month
    const hangoutsLastMonth = await db.content.count({
      where: {
        OR: [
          {
            userId: userId,
            type: 'HANGOUT',
            status: { in: ['PUBLISHED', 'ACTIVE'] },
            startTime: { gte: startOfLastMonth, lte: endOfLastMonth }
          },
          {
            content_participants: {
              some: {
                userId: userId,
                content: {
                  type: 'HANGOUT',
                  status: { in: ['PUBLISHED', 'ACTIVE'] },
                  startTime: { gte: startOfLastMonth, lte: endOfLastMonth }
                }
              }
            }
          }
        ]
      }
    })

    // Get all hangouts to analyze patterns
    const allHangouts = await db.content.findMany({
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
        rsvps: {
          where: {
            userId: userId,
            status: 'YES'
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 100 // Limit for performance
    })

    // Calculate most frequent hangout partner
    const partnerCounts = new Map<string, { count: number; user: any }>()
    
    allHangouts.forEach(hangout => {
      hangout.content_participants.forEach(participant => {
        if (participant.userId !== userId) {
          const existing = partnerCounts.get(participant.userId) || {
            count: 0,
            user: participant.user
          }
          existing.count++
          partnerCounts.set(participant.userId, existing)
        }
      })
    })

    const mostFrequentPartner = Array.from(partnerCounts.values())
      .sort((a, b) => b.count - a.count)[0] || null

    // Calculate favorite location
    const locationCounts = new Map<string, number>()
    allHangouts.forEach(hangout => {
      if (hangout.location) {
        locationCounts.set(
          hangout.location,
          (locationCounts.get(hangout.location) || 0) + 1
        )
      }
    })

    const favoriteLocation = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null
    const favoriteLocationCount = favoriteLocation
      ? locationCounts.get(favoriteLocation) || 0
      : 0

    // Calculate busiest day of week
    const dayCounts = new Map<number, number>()
    allHangouts.forEach(hangout => {
      if (hangout.startTime) {
        const day = new Date(hangout.startTime).getDay()
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
      }
    })

    const busiestDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0]
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const busiestDayName = busiestDay !== undefined ? dayNames[busiestDay] : null

    // Get friends to reconnect with (haven't hung out in 60+ days)
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACTIVE' },
          { friendId: userId, status: 'ACTIVE' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    const friendsToReconnect = []
    for (const friendship of friendships) {
      const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId
      const friend = friendship.userId === userId ? friendship.friend : friendship.user

      // Find last hangout with this friend
      const lastHangout = await db.content.findFirst({
        where: {
          type: 'HANGOUT',
          status: { in: ['PUBLISHED', 'ACTIVE'] },
          content_participants: {
            some: {
              userId: userId
            }
          },
          rsvps: {
            some: {
              userId: userId,
              status: 'YES'
            }
          }
        },
        include: {
          content_participants: {
            where: {
              userId: friendId
            }
          },
          rsvps: {
            where: {
              userId: friendId,
              status: 'YES'
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      })

      if (lastHangout && lastHangout.content_participants.length > 0 && lastHangout.rsvps.length > 0) {
        const lastHangoutDate = new Date(lastHangout.startTime)
        const daysSince = Math.floor((now.getTime() - lastHangoutDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSince >= 60) {
          friendsToReconnect.push({
            friendId: friend.id,
            friendName: friend.name,
            friendUsername: friend.username,
            friendAvatar: friend.avatar,
            daysSince,
            lastHangoutDate: lastHangoutDate.toISOString()
          })
        }
      } else {
        // Never hung out
        friendsToReconnect.push({
          friendId: friend.id,
          friendName: friend.name,
          friendUsername: friend.username,
          friendAvatar: friend.avatar,
          daysSince: null,
          lastHangoutDate: null
        })
      }
    }

    // Sort by days since (most urgent first)
    friendsToReconnect.sort((a, b) => {
      if (a.daysSince === null) return 1
      if (b.daysSince === null) return -1
      return b.daysSince - a.daysSince
    })

    const insights = {
      hangoutsThisMonth,
      hangoutsLastMonth,
      monthlyTrend: hangoutsThisMonth - hangoutsLastMonth,
      mostFrequentPartner: mostFrequentPartner ? {
        user: mostFrequentPartner.user,
        count: mostFrequentPartner.count
      } : null,
      favoriteLocation: favoriteLocation ? {
        location: favoriteLocation,
        count: favoriteLocationCount
      } : null,
      busiestDay: busiestDayName,
      friendsToReconnect: friendsToReconnect.slice(0, 5) // Top 5
    }

    return NextResponse.json(createSuccessResponse({ insights }, 'Insights retrieved successfully'))
  } catch (error: any) {
    logger.error('Error fetching user insights:', error)
    return NextResponse.json(
      createErrorResponse(
        'Failed to fetch insights',
        error?.message || 'Unknown error'
      ),
      { status: 500 }
    )
  }
}

