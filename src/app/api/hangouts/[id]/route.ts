import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updateHangoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  location: z.string().max(200, 'Location too long').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startTime: z.string().datetime('Invalid start time').optional(),
  endTime: z.string().datetime('Invalid end time').optional(),
  privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).optional(),
  maxParticipants: z.number().min(2, 'Must allow at least 2 participants').max(100, 'Too many participants').optional(),
  weatherEnabled: z.boolean().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
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

    // Get hangout with full details
    const hangout = await db.hangout.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        itinerary: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            participants: true,
            tasks: true,
            messages: true,
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(
        { error: 'Hangout not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this hangout
    const hasAccess = hangout.creatorId === payload.userId || 
      hangout.participants.some(p => p.userId === payload.userId) ||
      hangout.privacyLevel === 'PUBLIC'

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ hangout })
  } catch (error) {
    console.error('Get hangout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const validatedData = updateHangoutSchema.parse(body)

    // Check if hangout exists and user has edit permissions
    const hangout = await db.hangout.findUnique({
      where: { id: params.id },
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

    const canEdit = hangout.creatorId === payload.userId || 
      hangout.participants.some(p => p.canEdit)

    if (!canEdit) {
      return NextResponse.json(
        { error: 'No permission to edit this hangout' },
        { status: 403 }
      )
    }

    // Validate end time is after start time if both are provided
    if (validatedData.startTime && validatedData.endTime) {
      const startTime = new Date(validatedData.startTime)
      const endTime = new Date(validatedData.endTime)
      
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        )
      }
    }

    // Update hangout
    const updatedHangout = await db.hangout.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          }
        },
        participants: {
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
        },
        _count: {
          select: {
            participants: true,
            tasks: true,
          }
        }
      }
    })

    return NextResponse.json(updatedHangout)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    console.error('Update hangout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if hangout exists and user is the creator
    const hangout = await db.hangout.findUnique({
      where: { id: params.id }
    })

    if (!hangout) {
      return NextResponse.json(
        { error: 'Hangout not found' },
        { status: 404 }
      )
    }

    if (hangout.creatorId !== payload.userId) {
      return NextResponse.json(
        { error: 'Only the creator can delete this hangout' },
        { status: 403 }
      )
    }

    // Delete hangout (cascade will handle related records)
    await db.hangout.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete hangout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



