import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'

const inviteSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user must be invited'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params
    
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
    const { userIds } = inviteSchema.parse(body)

    // Check if hangout exists and user has permission to invite
    const hangout = await db.hangout.findUnique({
      where: { id: hangoutId },
      include: {
        participants: {
          where: { userId: payload.userId }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(
        { error: 'Hangout not found' },
        { status: 404 }
      )
    }

    const canInvite = hangout.creatorId === payload.userId || 
      hangout.participants.some(p => p.canEdit)

    if (!canInvite) {
      return NextResponse.json(
        { error: 'No permission to invite users to this hangout' },
        { status: 403 }
      )
    }

    // Check if hangout has reached max participants
    if (hangout.maxParticipants) {
      const currentParticipantCount = await db.hangoutParticipant.count({
        where: { hangoutId: hangoutId }
      })

      if (currentParticipantCount + userIds.length > hangout.maxParticipants) {
        return NextResponse.json(
          { error: 'Inviting these users would exceed the maximum participant limit' },
          { status: 400 }
        )
      }
    }

    // Get inviter info for notifications
    const inviter = await db.user.findUnique({
      where: { id: payload.userId },
      select: { name: true }
    })

    // Process invitations
    const results = []
    for (const userId of userIds) {
      try {
        // Check if user exists
        const user = await db.user.findUnique({
          where: { id: userId }
        })

        if (!user) {
          results.push({ userId, success: false, error: 'User not found' })
          continue
        }

        // Check if user is already a participant
        const existingParticipant = await db.hangoutParticipant.findUnique({
          where: {
            hangoutId_userId: {
              hangoutId: hangoutId,
              userId
            }
          }
        })

        if (existingParticipant) {
          results.push({ userId, success: false, error: 'User is already a participant' })
          continue
        }

        // Add user as participant
        const participant = await db.hangoutParticipant.create({
          data: {
            hangoutId: hangoutId,
            userId,
            role: 'MEMBER',
            rsvpStatus: 'PENDING',
            canEdit: false,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
              }
            }
          }
        })

        // Create notification
        if (inviter) {
          await createNotification({
            userId,
            type: 'HANGOUT_INVITATION',
            title: 'Hangout Invitation',
            message: `${inviter.name} invited you to "${hangout.title}"`,
            data: { hangoutId: hangoutId, inviterId: payload.userId }
          })
        }

        results.push({ userId, success: true, participant })
      } catch (_error) {
        results.push({ userId, success: false, error: 'Failed to invite user' })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    console.error('Invite users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



