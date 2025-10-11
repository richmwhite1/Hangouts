import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username

    const user = await db.user.findUnique({
      where: { username: username },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        backgroundImage: true,
        bio: true,
        location: true,
        website: true,
        birthDate: true,
        role: true,
        isActive: true,
        isVerified: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'User with this username does not exist', 404), { status: 404 })
    }

    return NextResponse.json(createSuccessResponse({ user }, 'User retrieved successfully'))

  } catch (error: any) {
    logger.error('Error fetching user by username:', error);
    return NextResponse.json(createErrorResponse('Failed to fetch user', error.message), { status: 500 })
  }
}

