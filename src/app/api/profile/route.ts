import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse } from '@/lib/api-handler'
import { db } from '@/lib/db'

async function getProfileHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    
    if (!username) {
      return createErrorResponse('Username required', 'Username parameter is required', 400)
    }

    // Get user profile
    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        backgroundImage: true,
        bio: true,
        location: true,
        zodiac: true,
        enneagram: true,
        bigFive: true,
        loveLanguage: true,
        createdAt: true,
        _count: {
          select: {
            content: true,
            content_participants: true,
            friendships: true
          }
        }
      }
    })

    if (!user) {
      return createErrorResponse('User not found', 'User with this username does not exist', 404)
    }

    // Get user's hangouts
    const hangouts = await db.content.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          {
            content_participants: {
              some: { userId: user.id }
            }
          }
        ],
        type: 'HANGOUT'
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        status: true,
        image: true,
        privacyLevel: true,
        creatorId: true,
        createdAt: true,
        content_participants: {
          select: {
            id: true,
            contentId: true,
            userId: true,
            role: true,
            canEdit: true,
            invitedAt: true,
            joinedAt: true,
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
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Transform hangouts data
    const transformedHangouts = hangouts.map(hangout => ({
      id: hangout.id,
      title: hangout.title,
      location: hangout.location,
      startTime: hangout.startTime?.toISOString(),
      endTime: hangout.endTime?.toISOString(),
      status: hangout.status,
      image: hangout.image,
      creatorId: hangout.creatorId,
      privacyLevel: hangout.privacyLevel,
      participants: hangout.content_participants.map(p => ({
        id: p.id,
        hangoutId: p.contentId,
        userId: p.userId,
        role: p.role,
        rsvpStatus: 'PENDING', // This would need to be fetched from rsvps table
        canEdit: p.canEdit,
        invitedAt: p.invitedAt.toISOString(),
        respondedAt: null,
        joinedAt: p.joinedAt?.toISOString(),
        user: p.users
      }))
    }))

    // Calculate stats
    const stats = {
      hangoutsHosted: user._count.content,
      hangoutsAttended: user._count.content_participants,
      friends: user._count.friendships,
      groups: 0 // This would need to be calculated from groups/communities
    }

    const profile = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      backgroundImage: user.backgroundImage,
      bio: user.bio,
      location: user.location,
      zodiac: user.zodiac,
      enneagram: user.enneagram,
      bigFive: user.bigFive,
      loveLanguage: user.loveLanguage,
      joinDate: user.createdAt.toISOString(),
      stats
    }

    return createSuccessResponse({
      profile,
      hangouts: transformedHangouts
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return createErrorResponse('Database error', 'Failed to fetch profile', 500)
  }
}

export const GET = createApiHandler(getProfileHandler, {
  requireAuth: false,
  enableRateLimit: true,
  enableCORS: true
})
