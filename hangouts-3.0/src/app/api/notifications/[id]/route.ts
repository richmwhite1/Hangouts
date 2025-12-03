import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { emitNotificationEvent } from '@/lib/server/notification-emitter'
// PATCH /api/notifications/[id] - Update notification (mark as read/dismissed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const { isRead, isDismissed } = body
    // Verify notification belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id,
        userId: user.id
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

    emitNotificationEvent(user.id, {
      type: 'updated',
      notificationId: id,
      changes: updatedNotification
    })

    return NextResponse.json(createSuccessResponse(updatedNotification, 'Notification updated successfully'))
  } catch (error) {
    logger.error('Error updating notification:', error);
    return NextResponse.json(createErrorResponse('Failed to update notification', error.message), { status: 500 })
  }
}
// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }
    const { id } = await params
    // Verify notification belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id,
        userId: user.id
      }
    })
    if (!notification) {
      return NextResponse.json(createErrorResponse('Not found', 'Notification not found'), { status: 404 })
    }
    await db.notification.delete({
      where: { id }
    })

    emitNotificationEvent(user.id, {
      type: 'deleted',
      notificationId: id
    })
    return NextResponse.json(createSuccessResponse(null, 'Notification deleted successfully'))
  } catch (error) {
    logger.error('Error deleting notification:', error);
    return NextResponse.json(createErrorResponse('Failed to delete notification', error.message), { status: 500 })
  }
}