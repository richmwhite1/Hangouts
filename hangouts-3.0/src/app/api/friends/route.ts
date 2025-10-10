import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's friends
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

    return NextResponse.json({
      success: true,
      friends: friendships
    })
  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    )
  }
}