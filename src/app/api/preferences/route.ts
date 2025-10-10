import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const preferences = await db.userPreference.findUnique({
      where: { userId: user.userId }
    })

    return NextResponse.json({
      preferences: preferences || {
        quickActivities: [],
        quickLocations: [],
        quickTimes: []
      }
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// POST /api/preferences - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { quickActivities, quickLocations, quickTimes } = await request.json()

    const preferences = await db.userPreference.upsert({
      where: { userId: user.userId },
      update: {
        quickActivities: quickActivities || null,
        quickLocations: quickLocations || null,
        quickTimes: quickTimes || null
      },
      create: {
        userId: user.userId,
        quickActivities: quickActivities || null,
        quickLocations: quickLocations || null,
        quickTimes: quickTimes || null
      }
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}












