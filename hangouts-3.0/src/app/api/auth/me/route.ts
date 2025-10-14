import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 /api/auth/me - Starting request')
    const { userId } = await auth()
    console.log('🔍 /api/auth/me - Clerk userId:', userId)
    
    if (!userId) {
      console.log('🔍 /api/auth/me - No userId, returning 401')
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const user = await getClerkApiUser()
    console.log('🔍 /api/auth/me - Database user found:', user ? 'YES' : 'NO')
    console.log('🔍 /api/auth/me - Database user ID:', user?.id)
    
    if (!user) {
      console.log('🔍 /api/auth/me - User not found, returning 404')
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    console.log('🔍 /api/auth/me - Returning success with user ID:', user.id, 'username:', user.username)
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
    logger.error('Get me error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}