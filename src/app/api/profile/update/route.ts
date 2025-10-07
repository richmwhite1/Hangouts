import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { avatar, backgroundImage, bio, location, name, zodiac, enneagram, bigFive, loveLanguage, favoriteActivities, favoritePlaces } = body

    // Validate user exists
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: payload.userId },
      data: {
        ...(avatar && { avatar }),
        ...(backgroundImage && { backgroundImage }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(name && { name }),
        ...(zodiac !== undefined && { zodiac }),
        ...(enneagram !== undefined && { enneagram }),
        ...(bigFive !== undefined && { bigFive }),
        ...(loveLanguage !== undefined && { loveLanguage }),
        ...(favoriteActivities !== undefined && { favoriteActivities: JSON.stringify(favoriteActivities) }),
        ...(favoritePlaces !== undefined && { favoritePlaces: JSON.stringify(favoritePlaces) }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        backgroundImage: true,
        bio: true,
        location: true,
        zodiac: true,
        enneagram: true,
        bigFive: true,
        loveLanguage: true,
        favoriteActivities: true,
        favoritePlaces: true,
        isActive: true,
        lastSeen: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser }
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Profile update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
