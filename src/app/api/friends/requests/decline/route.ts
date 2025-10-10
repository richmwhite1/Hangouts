import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { FriendsSystem } from '@/lib/friends-system'

// Decline friend request
async function declineFriendRequestHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('requestId')
  
  if (!requestId) {
    return createErrorResponse('Request ID is required', 'MISSING_REQUEST_ID')
  }

  try {
    const request = await FriendsSystem.declineFriendRequest(requestId, userId)
    return createSuccessResponse({ request }, 'Friend request declined')
  } catch (error) {
    console.error('Error declining friend request:', error)
    return createErrorResponse('Failed to decline friend request', error instanceof Error ? error.message : 'Unknown error')
  }
}

export const POST = createApiHandler(declineFriendRequestHandler)
