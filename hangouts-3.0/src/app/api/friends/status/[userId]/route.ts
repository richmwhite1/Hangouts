import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const currentUserId = user.id
    const targetUserId = params.userId
    // Check if users are friends
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId }
        ],
        status: 'ACTIVE'
      }
    })
    // Check if there's a pending friend request
    const friendRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId }
        ],
        status: 'PENDING'
      }
    })
    const isFriend = !!friendship
    const friendRequestSent = friendRequest?.senderId === currentUserId
    const friendRequestReceived = friendRequest?.receiverId === currentUserId
    return NextResponse.json(createSuccessResponse({
      isFriend,
      friendRequestSent,
      friendRequestReceived
    }, 'Friendship status retrieved successfully'))
  } catch (error: any) {
    console.error('Error fetching friendship status:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch friendship status', error.message), { status: 500 })
  }
}