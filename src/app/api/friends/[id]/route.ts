import { NextRequest } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'
import { withAuth } from '@/lib/api-middleware'
import { db } from '@/lib/db'

async function removeFriendHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.user?.userId
  const friendId = params.id

  if (!userId) {
    return createErrorResponse('Authentication required', 'User ID not provided', 401)
  }

  if (!friendId) {
    return createErrorResponse('Invalid request', 'Friend ID is required', 400)
  }

  if (userId === friendId) {
    return createErrorResponse('Invalid request', 'Cannot unfriend yourself', 400)
  }

  try {
    // Check if friendship exists
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: friendId },
          { user1Id: friendId, user2Id: userId }
        ]
      }
    })

    if (!friendship) {
      return createErrorResponse('Not found', 'Friendship not found', 404)
    }

    // Delete the friendship
    await db.friendship.delete({
      where: { id: friendship.id }
    })

    return createSuccessResponse({ success: true })
  } catch (error) {
    console.error('Database error in removeFriendHandler:', error)
    return createErrorResponse('Database error', 'Failed to remove friend', 500)
  }
}

export const DELETE = createApiHandler(removeFriendHandler, {
  requireAuth: true,
  enableRateLimit: true,
  enableCORS: true
})
