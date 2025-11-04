import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

import { logger } from '@/lib/logger'
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      // Return success with null user for unauthenticated users
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    try {
      const user = await getClerkApiUser()
      
      if (!user) {
        // User exists in Clerk but not in database - return minimal info
        logger.warn(`User not found in database for Clerk ID: ${userId}`)
        return NextResponse.json({
          success: true,
          data: { 
            id: userId,
            clerkId: userId,
            username: null,
            name: null,
            email: null
          }
        })
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
    } catch (userError) {
      logger.error('Error fetching user from database:', userError)
      // Return minimal info if database lookup fails
      return NextResponse.json({
        success: true,
        data: { 
          id: userId,
          clerkId: userId,
          username: null,
          name: null,
          email: null
        }
      })
    }

  } catch (error) {
    logger.error('Error in /api/auth/me:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}