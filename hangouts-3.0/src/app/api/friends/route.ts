import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's friends using the correct schema (userId/friendId)
    const friendships = await db.friendship.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        }
      }
    })

    // Transform friendships to match expected format
    const friends = friendships.map(friendship => ({
      id: friendship.id,
      friend: friendship.friend,
      status: friendship.status,
      createdAt: friendship.createdAt
    }))

    return NextResponse.json({
      success: true,
      friends: friends
    })
  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    )
  }
}