import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// DELETE /api/push/unsubscribe - Unsubscribe user from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json(createErrorResponse('Missing endpoint', 'Endpoint parameter is required'), { status: 400 })
    }

    // Find and delete the subscription
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (!subscription) {
      return NextResponse.json(createErrorResponse('Subscription not found', 'Push subscription not found'), { status: 404 })
    }

    // Verify ownership
    if (subscription.userId !== user.id) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You can only delete your own subscriptions'), { status: 403 })
    }

    await db.pushSubscription.delete({
      where: { endpoint }
    })

    logger.info(`Push subscription deleted for user ${user.id}`)
    return NextResponse.json(createSuccessResponse(null, 'Push subscription deleted successfully'))

  } catch (error) {
    logger.error('Error deleting push subscription:', error)
    return NextResponse.json(createErrorResponse('Failed to delete push subscription', error.message), { status: 500 })
  }
}

// DELETE /api/push/unsubscribe/all - Unsubscribe user from all push notifications
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const body = await request.json()
    const { unsubscribeAll } = body

    if (unsubscribeAll) {
      // Delete all subscriptions for this user
      const result = await db.pushSubscription.deleteMany({
        where: { userId: user.id }
      })

      logger.info(`All push subscriptions deleted for user ${user.id} (${result.count} subscriptions)`)
      return NextResponse.json(createSuccessResponse({ deletedCount: result.count }, 'All push subscriptions deleted successfully'))
    }

    return NextResponse.json(createErrorResponse('Invalid request', 'unsubscribeAll must be true'), { status: 400 })

  } catch (error) {
    logger.error('Error deleting all push subscriptions:', error)
    return NextResponse.json(createErrorResponse('Failed to delete push subscriptions', error.message), { status: 500 })
  }
}
