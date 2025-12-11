import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 401 })
    }

    // Parse request body
    const { action, hangoutId } = await request.json()

    if (!action || !hangoutId) {
      return NextResponse.json({
        success: false,
        error: 'Missing action or hangoutId'
      }, { status: 400 })
    }

    logger.info('Executing auth intent', { action, hangoutId, userId: user.id })

    // Execute the intent
    if (action === 'join') {
      try {
        // Call the join API endpoint
        const joinResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hangouts/${hangoutId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await auth().getToken()}`
          }
        })

        if (joinResponse.ok) {
          const joinData = await joinResponse.json()
          logger.info('Intent execution successful - joined hangout', {
            hangoutId,
            userId: user.id,
            joinData
          })

          return NextResponse.json({
            success: true,
            redirectTo: `/hangout/${hangoutId}`,
            message: 'Successfully joined hangout'
          })
        } else {
          const errorData = await joinResponse.json()
          logger.error('Intent execution failed - join API error', {
            hangoutId,
            userId: user.id,
            status: joinResponse.status,
            error: errorData
          })

          // If user is already a participant, still redirect to hangout
          if (joinResponse.status === 400 && errorData.error?.includes('already')) {
            return NextResponse.json({
              success: true,
              redirectTo: `/hangout/${hangoutId}`,
              message: 'Already a participant'
            })
          }

          return NextResponse.json({
            success: false,
            error: errorData.error || 'Failed to join hangout'
          }, { status: joinResponse.status })
        }
      } catch (joinError) {
        logger.error('Intent execution failed - network error', {
          hangoutId,
          userId: user.id,
          error: joinError
        })

        return NextResponse.json({
          success: false,
          error: 'Network error while joining hangout'
        }, { status: 500 })
      }
    } else if (action === 'view_friends_only') {
      // For friends-only access, just redirect to the hangout page
      // The hangout page will handle the privacy check
      logger.info('Intent execution - friends-only access', {
        hangoutId,
        userId: user.id
      })

      return NextResponse.json({
        success: true,
        redirectTo: `/hangout/${hangoutId}`,
        message: 'Redirecting to hangout'
      })
    } else {
      logger.warn('Unknown intent action', { action, hangoutId, userId: user.id })
      return NextResponse.json({
        success: false,
        error: 'Unknown intent action'
      }, { status: 400 })
    }

  } catch (error) {
    logger.error('Error executing auth intent:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}