import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

// PATCH /api/notifications/[id] - Update notification (mark as read/dismissed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { isRead, isDismissed } = body

    // Verify notification belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id,
        userId: payload.userId
      }
    })

    if (!notification) {
      return NextResponse.json(createErrorResponse('Not found', 'Notification not found'), { status: 404 })
    }

    const updateData: any = {}
    if (isRead !== undefined) {
      updateData.isRead = isRead
      if (isRead) {
        updateData.readAt = new Date()
      }
    }
    if (isDismissed !== undefined) {
      updateData.isDismissed = isDismissed
      if (isDismissed) {
        updateData.dismissedAt = new Date()
      }
    }

    const updatedNotification = await db.notification.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(createSuccessResponse(updatedNotification, 'Notification updated successfully'))

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(createErrorResponse('Failed to update notification', error.message), { status: 500 })
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id } = await params

    // Verify notification belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id,
        userId: payload.userId
      }
    })

    if (!notification) {
      return NextResponse.json(createErrorResponse('Not found', 'Notification not found'), { status: 404 })
    }

    await db.notification.delete({
      where: { id }
    })

    return NextResponse.json(createSuccessResponse(null, 'Notification deleted successfully'))

  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(createErrorResponse('Failed to delete notification', error.message), { status: 500 })
  }
}
