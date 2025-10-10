import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { FriendsSystem } from '@/lib/friends-system'

// Accept friend request
async function acceptFriendRequestHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('requestId')
  
  if (!requestId) {
    return createErrorResponse('Request ID is required', 'MISSING_REQUEST_ID')
  }

  try {
    const result = await FriendsSystem.acceptFriendRequest(requestId, userId)
    return createSuccessResponse({ 
      friendship: result.friendship,
      request: result.request 
    }, 'Friend request accepted successfully')
  } catch (error) {
    console.error('Error accepting friend request:', error)
    return createErrorResponse('Failed to accept friend request', error instanceof Error ? error.message : 'Unknown error')
  }
}

export const POST = createApiHandler(acceptFriendRequestHandler)
