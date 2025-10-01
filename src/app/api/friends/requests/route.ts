import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { FriendsSystem } from '@/lib/friends-system'

// Get pending friend requests (sent and received)
async function getFriendRequestsHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId

  try {
    const requests = await FriendsSystem.getPendingRequests(userId)
    return createSuccessResponse({ requests })
  } catch (error) {
    console.error('Error fetching friend requests:', error)
    return createErrorResponse('Failed to fetch friend requests', error instanceof Error ? error.message : 'Unknown error')
  }
}

export const GET = createApiHandler(getFriendRequestsHandler)