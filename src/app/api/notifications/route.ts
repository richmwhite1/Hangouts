import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const isRead = searchParams.get('isRead')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      userId: payload.userId
    }

    if (type) {
      where.type = type
    }

    if (isRead !== null) {
      where.isRead = isRead === 'true'
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const totalCount = await db.notification.count({ where })

    return NextResponse.json(createSuccessResponse({
      notifications,
      totalCount,
      hasMore: offset + notifications.length < totalCount
    }, 'Notifications retrieved successfully'))

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch notifications', error.message), { status: 500 })
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const body = await request.json()
    const { userId, type, title, message, data } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(createErrorResponse('Missing required fields', 'userId, type, title, and message are required'), { status: 400 })
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || null
      }
    })

    return NextResponse.json(createSuccessResponse(notification, 'Notification created successfully'))

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(createErrorResponse('Failed to create notification', error.message), { status: 500 })
  }
}