import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    // In development mode without Clerk keys, use development user
    let user
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')) {
      user = {
        id: 'cmgmmbehc0000jpzattv53v2o',
        email: 'dev@example.com',
        username: 'devuser',
        name: 'Development User'
      }
    } else {
      const { userId: clerkUserId } = await auth()
      if (!clerkUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      user = await getClerkApiUser()
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
      }
    }

    // Get friend requests (both sent and received)
    const friendRequests = await db.friendRequest.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      requests: friendRequests
    })
  } catch (error) {
    logger.error('Error fetching friend requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friend requests' },
      { status: 500 }
    )
  }
}