import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { avatar, backgroundImage, bio, location, name, zodiac, enneagram, bigFive, loveLanguage, favoriteActivities, favoritePlaces } = body

    // Validate user exists
    const existingUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true }
    })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: user.id },
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
        ...(favoritePlaces !== undefined && { favoritePlaces: JSON.stringify(favoritePlaces) })},
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
        createdAt: true}
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser }
    })

  } catch (error) {
    logger.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Profile update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
