import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user ID from Clerk auth
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const hangoutId = params.id

    // Get the hangout
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    // Check if hangout is public
    if (hangout.privacyLevel !== 'PUBLIC') {
      return NextResponse.json({ error: 'This hangout is not public' }, { status: 403 })
    }

    // Check if user is already a participant
    const existingParticipant = hangout.participants.find(p => p.userId === user.id)
    if (existingParticipant) {
      return NextResponse.json({ error: 'You are already a participant' }, { status: 400 })
    }

    // Add user as participant
    await db.content_participants.create({
      data: {
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: hangoutId,
        userId: user.id,
        role: 'MEMBER',
        canEdit: false,
        isMandatory: false,
        isCoHost: false,
        joinedAt: new Date()
      }
    })

    // Add RSVP entry
    await db.rsvp.create({
      data: {
        id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: hangoutId,
        userId: user.id,
        status: 'YES',
        respondedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully joined hangout'
    })

  } catch (error) {
    console.error('Error joining hangout:', error)
    return NextResponse.json(
      { error: 'Failed to join hangout' },
      { status: 500 }
    )
  }
}
