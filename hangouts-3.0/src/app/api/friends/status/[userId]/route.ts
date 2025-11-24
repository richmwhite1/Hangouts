import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'User not found in database'), { status: 401 })
    }

    const { userId: targetUserId } = await params
    const currentUserId = user.id
    // Check if users are friends
    let friendship
    try {
      friendship = await db.friendship.findFirst({
        where: {
          OR: [
            { userId: currentUserId, friendId: targetUserId },
            { userId: targetUserId, friendId: currentUserId }
          ],
          status: 'ACTIVE'
        },
        select: {
          id: true,
          desiredHangoutFrequency: true
        }
      })
    } catch (dbError: any) {
      // If error is about missing column, try without desiredHangoutFrequency
      if (dbError?.code === 'P2022' && dbError?.meta?.column?.includes('desiredHangoutFrequency')) {
        logger.warn('desiredHangoutFrequency column not found, querying without it')
        friendship = await db.friendship.findFirst({
          where: {
            OR: [
              { userId: currentUserId, friendId: targetUserId },
              { userId: targetUserId, friendId: currentUserId }
            ],
            status: 'ACTIVE'
          },
          select: {
            id: true
          }
        })
      } else {
        throw dbError
      }
    }
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
    
    // Return in format expected by frontend
    return NextResponse.json({
      success: true,
      data: {
        isFriend,
        friendRequestSent,
        friendRequestReceived,
        desiredHangoutFrequency: (friendship as any)?.desiredHangoutFrequency || null
      }
    })
  } catch (error: any) {
    logger.error('Error fetching friendship status:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch friendship status', error.message), { status: 500 })
  }
}