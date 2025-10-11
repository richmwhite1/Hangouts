import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { FriendsSystem } from '@/lib/friends-system'

import { logger } from '@/lib/logger'
// Search for users to add as friends
async function searchUsersHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // Always return users, even with empty query (for initial load)
    const users = await FriendsSystem.searchUsers(query, userId, limit)
    return createSuccessResponse({ users })
  } catch (error) {
    logger.error('Error searching users:', error);
    return createErrorResponse('Failed to search users', error instanceof Error ? error.message : 'Unknown error')
  }
}

export const GET = createApiHandler(searchUsersHandler)