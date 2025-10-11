import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { FriendsSystem } from '@/lib/friends-system'

import { logger } from '@/lib/logger'
async function getRecentFriendsHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId

  try {
    // Get user's friends (they're already sorted by most recent)
    const friends = await FriendsSystem.getUserFriends(userId)
    
    // Return the 10 most recent friends
    const recentFriends = friends.slice(0, 10)
    
    return createSuccessResponse({ data: recentFriends })
  } catch (error) {
    logger.error('Error fetching recent friends:', error);
    return createErrorResponse('Failed to fetch recent friends', error instanceof Error ? error.message : 'Unknown error')
  }
}

export const GET = createApiHandler(getRecentFriendsHandler)