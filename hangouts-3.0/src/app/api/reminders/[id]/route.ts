import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
// PATCH /api/reminders/[id] - Update reminder (dismiss)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const { isDismissed } = body
    // Verify reminder belongs to user
    const reminder = await db.reminder.findFirst({
      where: {
        id,
        userId: user.id
      }
    })
    if (!reminder) {
      return NextResponse.json(createErrorResponse('Not found', 'Reminder not found'), { status: 404 })
    }
    const updateData: any = {}
    if (isDismissed !== undefined) {
      updateData.isDismissed = isDismissed
      if (isDismissed) {
        updateData.dismissedAt = new Date()
      }
    }
    const updatedReminder = await db.reminder.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(createSuccessResponse(updatedReminder, 'Reminder updated successfully'))
  } catch (error) {
    logger.error('Error updating reminder:', error);
    return NextResponse.json(createErrorResponse('Failed to update reminder', error.message), { status: 500 })
  }
}
// DELETE /api/reminders/[id] - Delete reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const { id } = await params
    // Verify reminder belongs to user
    const reminder = await db.reminder.findFirst({
      where: {
        id,
        userId: user.id
      }
    })
    if (!reminder) {
      return NextResponse.json(createErrorResponse('Not found', 'Reminder not found'), { status: 404 })
    }
    await db.reminder.delete({
      where: { id }
    })
    return NextResponse.json(createSuccessResponse(null, 'Reminder deleted successfully'))
  } catch (error) {
    logger.error('Error deleting reminder:', error);
    return NextResponse.json(createErrorResponse('Failed to delete reminder', error.message), { status: 500 })
  }
}