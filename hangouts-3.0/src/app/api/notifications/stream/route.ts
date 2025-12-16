import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { getClerkApiUser } from '@/lib/clerk-auth'
import { logger } from '@/lib/logger'
import { subscribeToNotificationEvents, type NotificationRealtimeEvent } from '@/lib/server/notification-emitter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Check if database is configured before attempting to get user
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
      logger.warn('notification-stream: DATABASE_URL not configured', { clerkUserId })
      return new Response('Service temporarily unavailable', { status: 503 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      // User doesn't exist in database yet - this is okay, just return 401
      // The user will be created when they try to create a hangout
      logger.info('notification-stream: User not found in database', { clerkUserId })
      return new Response('Unauthorized', { status: 401 })
    }

    let cleanup: (() => void) | null = null

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        send('connected', { timestamp: Date.now() })

        const unsubscribe = subscribeToNotificationEvents(user.id, (event: NotificationRealtimeEvent) => {
          send('notification', event)
        })

        const keepAlive = setInterval(() => {
          send('ping', { timestamp: Date.now() })
        }, 25000)

        let cleanedUp = false
        cleanup = () => {
          if (cleanedUp) return
          cleanedUp = true
          clearInterval(keepAlive)
          unsubscribe()
          try {
            controller.close()
          } catch (error) {
            logger.warn('notification-stream: unable to close controller', { error })
          }
        }

        request.signal.addEventListener('abort', () => cleanup?.())

        controller.enqueue(encoder.encode(': stream started\n\n'))
      },
      cancel() {
        logger.info('notification-stream cancelled for user', { userId: user.id })
        cleanup?.()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    })
  } catch (error) {
    logger.error('notification-stream failed', { error })
    return new Response('Internal Server Error', { status: 500 })
  }
}

