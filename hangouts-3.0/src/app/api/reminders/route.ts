import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
// GET /api/reminders - Get user reminders
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const isSent = searchParams.get('isSent')
    const upcoming = searchParams.get('upcoming') === 'true'
    // Build where clause
    const where: any = {
      userId: user.id,
      isDismissed: false
    }
    if (type) {
      where.type = type
    }
    if (isSent !== null) {
      where.isSent = isSent === 'true'
    }
    if (upcoming) {
      where.scheduledFor = {
        gte: new Date()
      }
    }
    const reminders = await db.reminder.findMany({
      where,
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            startTime: true,
            endTime: true,
            location: true
          }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    })
    return NextResponse.json(createSuccessResponse(reminders, 'Reminders retrieved successfully'))
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch reminders', error.message), { status: 500 })
  }
}
// POST /api/reminders - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const body = await request.json()
    const { contentId, type, title, message, scheduledFor } = body
    if (!type || !title || !message || !scheduledFor) {
      return NextResponse.json(createErrorResponse('Missing required fields', 'type, title, message, and scheduledFor are required'), { status: 400 })
    }
    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        contentId: contentId || null,
        type,
        title,
        message,
        scheduledFor: new Date(scheduledFor)
      }
    })
    return NextResponse.json(createSuccessResponse(reminder, 'Reminder created successfully'))
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(createErrorResponse('Failed to create reminder', error.message), { status: 500 })
  }
}