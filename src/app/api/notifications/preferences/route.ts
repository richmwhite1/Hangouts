import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get notification preferences
    const preferences = await db.notificationPreference.findMany({
      where: { userId: payload.userId }
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Get notification preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, emailEnabled, pushEnabled, inAppEnabled } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Notification type is required' },
        { status: 400 }
      )
    }

    // Update or create notification preference
    const preference = await db.notificationPreference.upsert({
      where: {
        userId_type: {
          userId: payload.userId,
          type
        }
      },
      update: {
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? true,
        inAppEnabled: inAppEnabled ?? true,
      },
      create: {
        userId: payload.userId,
        type,
        emailEnabled: emailEnabled ?? true,
        pushEnabled: pushEnabled ?? true,
        inAppEnabled: inAppEnabled ?? true,
      }
    })

    return NextResponse.json({ preference })
  } catch (error) {
    console.error('Update notification preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



