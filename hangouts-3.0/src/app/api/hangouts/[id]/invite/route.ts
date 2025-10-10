import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hangoutId = params.id
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 })
    }

    // Check if hangout exists and user is the creator
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        content_participants: {
          include: {
            users: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    if (hangout.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can invite people' }, { status: 403 })
    }

    // Check if users exist and are friends
    const users = await db.user.findMany({
      where: {
        id: { in: userIds }
      }
    })

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: 'Some users not found' }, { status: 400 })
    }

    // Check if users are already participants
    const existingParticipants = await db.content_participants.findMany({
      where: {
        contentId: hangoutId,
        userId: { in: userIds }
      }
    })

    const existingUserIds = existingParticipants.map(p => p.userId)
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
      return NextResponse.json({ error: 'All users are already participants' }, { status: 400 })
    }

    // Add new participants
    const participants = await db.content_participants.createMany({
      data: newUserIds.map(userId => ({
        contentId: hangoutId,
        userId,
        role: 'MEMBER',
        canEdit: false,
        isMandatory: false,
        isCoHost: false,
        invitedAt: new Date()
      })),
      skipDuplicates: true
    })

    // Create RSVP entries
    await db.rsvp.createMany({
      data: newUserIds.map(userId => ({
        contentId: hangoutId,
        userId,
        status: 'PENDING'
      })),
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      message: `Invited ${newUserIds.length} people to the hangout`,
      invitedCount: newUserIds.length,
      skippedCount: existingUserIds.length
    })
  } catch (error) {
    console.error('Error inviting people to hangout:', error)
    return NextResponse.json(
      { error: 'Failed to invite people to hangout' },
      { status: 500 }
    )
  }
}