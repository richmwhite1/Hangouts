import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { FriendsSystem } from '@/lib/friends-system'

// Get user's friends
async function getFriendsHandler(request: NextRequest) {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required'
    }, { status: 401 })
  }

  try {
    const friends = await FriendsSystem.getUserFriends(userId)
    return NextResponse.json({
      success: true,
      data: { friends }
    })
  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch friends',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Send friend request
async function sendFriendRequestHandler(request: NextRequest) {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required'
    }, { status: 401 })
  }

  const { receiverId } = await request.json()

  if (!receiverId) {
    return NextResponse.json({
      success: false,
      error: 'Receiver ID is required',
      message: 'MISSING_RECEIVER_ID'
    }, { status: 400 })
  }

  if (userId === receiverId) {
    return NextResponse.json({
      success: false,
      error: 'Cannot send friend request to yourself',
      message: 'INVALID_RECEIVER'
    }, { status: 400 })
  }

  try {
    const friendRequest = await FriendsSystem.sendFriendRequest(userId, receiverId)
    return NextResponse.json({
      success: true,
      data: { friendRequest },
      message: 'Friend request sent successfully'
    })
  } catch (error) {
    console.error('Error sending friend request:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send friend request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export const GET = getFriendsHandler
export const POST = sendFriendRequestHandler