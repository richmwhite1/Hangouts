import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const rsvpSchema = z.object({
  status: z.enum(['YES', 'NO', 'MAYBE']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status } = rsvpSchema.parse(body)

    // Check if hangout exists
    const hangout = await db.hangout.findUnique({
      where: { id: params.id }
    })

    if (!hangout) {
      return NextResponse.json(
        { error: 'Hangout not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant
    const participant = await db.hangoutParticipant.findUnique({
      where: {
        hangoutId_userId: {
          hangoutId: params.id,
          userId: payload.userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a participant of this hangout' },
        { status: 403 }
      )
    }

    // Update RSVP status
    const updatedParticipant = await db.hangoutParticipant.update({
      where: {
        hangoutId_userId: {
          hangoutId: params.id,
          userId: payload.userId
        }
      },
      data: {
        rsvpStatus: status,
        respondedAt: new Date(),
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

    return NextResponse.json({ participant: updatedParticipant })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    console.error('Update RSVP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



