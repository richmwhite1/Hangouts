import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()
    const requestId = params.id

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Find the friend request
    const friendRequest = await db.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: user.id,
        status: 'PENDING'
      }
    })

    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 })
    }

    // Update the friend request status
    const updatedRequest = await db.friendRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // If accepted, create friendship
    if (status === 'ACCEPTED') {
      await db.friendship.createMany({
        data: [
          {
            userId: friendRequest.senderId,
            friendId: friendRequest.receiverId,
            status: 'ACTIVE'
          },
          {
            userId: friendRequest.receiverId,
            friendId: friendRequest.senderId,
            status: 'ACTIVE'
          }
        ],
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })
  } catch (error) {
    console.error('Error responding to friend request:', error)
    return NextResponse.json(
      { error: 'Failed to respond to friend request' },
      { status: 500 }
    )
  }
}
