import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const createPollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RANKING', 'CONSENSUS']).default('SINGLE_CHOICE'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required'),
  expiresAt: z.string().datetime().optional(),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
})

export async function GET(
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

    // Check if user is a participant of the hangout
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

    // Get all polls for the hangout
    const polls = await db.hangoutPoll.findMany({
      where: { hangoutId: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          }
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              }
            }
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ polls })
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const body = await request.json()
    const validatedData = createPollSchema.parse(body)

    // Create the poll
    const poll = await db.hangoutPoll.create({
      data: {
        hangoutId: params.id,
        creatorId: payload.userId,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        options: validatedData.options,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        allowMultiple: validatedData.allowMultiple,
        isAnonymous: validatedData.isAnonymous,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          }
        },
        votes: true,
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    return NextResponse.json({ poll }, { status: 201 })
  } catch (error) {
    console.error('Error creating poll:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    )
  }
}



