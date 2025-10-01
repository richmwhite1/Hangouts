import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// GET /api/notifications/stats - Get notification statistics
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
    const timeRange = searchParams.get('timeRange') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0) // All time
    }

    // Get total notifications
    const totalNotifications = await db.notification.count({
      where: {
        userId: payload.userId,
        createdAt: {
          gte: startDate
        }
      }
    })

    // Get unread notifications
    const unreadNotifications = await db.notification.count({
      where: {
        userId: payload.userId,
        isRead: false,
        isDismissed: false,
        createdAt: {
          gte: startDate
        }
      }
    })

    // Get notifications by type
    const notificationsByType = await db.notification.groupBy({
      by: ['type'],
      where: {
        userId: payload.userId,
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        type: true
      }
    })

    const byType = notificationsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type
      return acc
    }, {} as Record<string, number>)

    // Get notifications by day (last 7 days)
    const notificationsByDay = await db.notification.groupBy({
      by: ['createdAt'],
      where: {
        userId: payload.userId,
        createdAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      _count: {
        createdAt: true
      }
    })

    const byDay = notificationsByDay.reduce((acc, item) => {
      const date = item.createdAt.toISOString().split('T')[0]
      acc[date] = item._count.createdAt
      return acc
    }, {} as Record<string, number>)

    // Calculate read rate
    const readRate = totalNotifications > 0 
      ? ((totalNotifications - unreadNotifications) / totalNotifications) * 100 
      : 0

    // Get recent activity (last 24 hours)
    const recentActivity = await db.notification.count({
      where: {
        userId: payload.userId,
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }
    })

    // Get most active notification type
    const mostActiveType = notificationsByType.length > 0 
      ? notificationsByType.reduce((prev, current) => 
          prev._count.type > current._count.type ? prev : current
        ).type
      : null

    const stats = {
      total: totalNotifications,
      unread: unreadNotifications,
      byType,
      byDay,
      readRate: Math.round(readRate * 10) / 10, // Round to 1 decimal place
      recentActivity,
      mostActiveType,
      timeRange
    }

    return NextResponse.json(createSuccessResponse(stats, 'Notification statistics retrieved successfully'))

  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch notification statistics', error.message), { status: 500 })
  }
}
