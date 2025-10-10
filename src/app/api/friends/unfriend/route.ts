import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Invalid token'), { status: 401 })
    }

    const { friendId } = await request.json()

    if (!friendId) {
      return NextResponse.json(createErrorResponse('Bad Request', 'Friend ID is required'), { status: 400 })
    }

    // Check if friendship exists
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: payload.userId, friendId: friendId },
          { userId: friendId, friendId: payload.userId }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json(createErrorResponse('Not Found', 'Friendship not found'), { status: 404 })
    }

    // Delete both sides of the friendship
    await db.friendship.deleteMany({
      where: {
        OR: [
          { userId: payload.userId, friendId: friendId },
          { userId: friendId, friendId: payload.userId }
        ]
      }
    })

    return NextResponse.json(createSuccessResponse(
      { message: 'Successfully unfriended user' },
      'User unfriended successfully'
    ))

  } catch (error) {
    console.error('Unfriend error:', error)
    return NextResponse.json(createErrorResponse('Internal Server Error', 'Failed to unfriend user'), { status: 500 })
  }
}










