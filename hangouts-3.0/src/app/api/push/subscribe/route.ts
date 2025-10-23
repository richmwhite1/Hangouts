import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// POST /api/push/subscribe - Subscribe user to push notifications
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
    const { endpoint, keys } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(createErrorResponse('Invalid subscription', 'Missing required fields'), { status: 400 })
    }

    // Check if subscription already exists
    const existingSubscription = await db.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (existingSubscription) {
      // Update existing subscription
      const updatedSubscription = await db.pushSubscription.update({
        where: { endpoint },
        data: {
          userId: user.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: request.headers.get('user-agent') || null,
          updatedAt: new Date()
        }
      })

      return NextResponse.json(createSuccessResponse(updatedSubscription, 'Push subscription updated successfully'))
    }

    // Create new subscription
    const subscription = await db.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get('user-agent') || null
      }
    })

    logger.info(`Push subscription created for user ${user.id}`)
    return NextResponse.json(createSuccessResponse(subscription, 'Push subscription created successfully'))

  } catch (error) {
    logger.error('Error creating push subscription:', error)
    return NextResponse.json(createErrorResponse('Failed to create push subscription', error.message), { status: 500 })
  }
}

// GET /api/push/subscribe - Get user's push subscriptions
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(createSuccessResponse(subscriptions, 'Push subscriptions retrieved successfully'))

  } catch (error) {
    logger.error('Error fetching push subscriptions:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch push subscriptions', error.message), { status: 500 })
  }
}
