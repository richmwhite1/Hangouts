import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      logger.warn('Authentication required for /api/auth/me')
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const user = await getClerkApiUser()
    
    if (!user) {
      logger.warn(`User not found for Clerk ID: ${userId}`)
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { 
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    logger.error('Error in /api/auth/me:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}