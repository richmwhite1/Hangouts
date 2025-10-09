import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { FriendsSystem } from '@/lib/friends-system'

// Get pending friend requests (sent and received)
async function getFriendRequestsHandler(request: NextRequest) {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required'
    }, { status: 401 })
  }

  try {
    const requests = await FriendsSystem.getPendingRequests(userId)
    return NextResponse.json({
      success: true,
      data: { requests }
    })
  } catch (error) {
    console.error('Error fetching friend requests:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch friend requests',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export const GET = getFriendRequestsHandler