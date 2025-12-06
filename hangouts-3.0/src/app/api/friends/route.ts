import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { getUserFriends } from '@/lib/universal-friendship-queries'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // Handle POST requests - redirect to appropriate endpoint or return method not allowed
  return NextResponse.json(
    { error: 'Method not allowed. Use /api/friends/request for sending friend requests.' },
    { status: 405 }
  )
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Use universal friendship queries that handle both schemas
    const friends = await getUserFriends(user.id)

    return NextResponse.json({
      success: true,
      friends: friends
    })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack || ''
    logger.error('Error fetching friends:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
      userId: user?.id
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch friends',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}