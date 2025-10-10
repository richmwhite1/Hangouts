import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    console.error('Error fetching friend requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friend requests' },
      { status: 500 }
    )
  }
}