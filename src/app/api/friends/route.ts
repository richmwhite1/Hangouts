import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { FriendsSystem } from '@/lib/friends-system'

// Get user's friends
async function getFriendsHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId

  try {
    const friends = await FriendsSystem.getUserFriends(userId)
    return createSuccessResponse({ friends })
  } catch (error) {
    console.error('Error fetching friends:', error)
    return createErrorResponse('Failed to fetch friends', error instanceof Error ? error.message : 'Unknown error')
  }
}

// Send friend request
async function sendFriendRequestHandler(request: AuthenticatedRequest) {
  const userId = request.user.userId
  const { receiverId } = await request.json()

  if (!receiverId) {
    return createErrorResponse('Receiver ID is required', 'MISSING_RECEIVER_ID')
  }

  if (userId === receiverId) {
    return createErrorResponse('Cannot send friend request to yourself', 'INVALID_RECEIVER')
  }

  try {
    const friendRequest = await FriendsSystem.sendFriendRequest(userId, receiverId)
    return createSuccessResponse({ friendRequest }, 'Friend request sent successfully')
  } catch (error) {
    console.error('Error sending friend request:', error)
    return createErrorResponse('Failed to send friend request', error instanceof Error ? error.message : 'Unknown error')
  }
}

export const GET = createApiHandler(getFriendsHandler)
export const POST = createApiHandler(sendFriendRequestHandler)