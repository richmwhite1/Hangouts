import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createSuccessResponse, createErrorResponse, PollResponse } from '@/lib/api-response'

import { logger } from '@/lib/logger'
// Validation schemas - Simplified for new schema
const CreatePollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  options: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(200).optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional()
  })).min(2).max(10),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  visibility: z.enum(['PRIVATE', 'FRIENDS', 'PUBLIC']).default('PRIVATE')
})

// GET /api/hangouts/[id]/polls - Get all polls for a specific hangout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: hangoutId } = await params

    // Get the hangout details ID from the content ID
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: { 
        hangout_details: true
      }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    // Polls must use hangout_details ID due to foreign key constraint
    const hangoutDetailsId = hangout.hangout_details?.id
    if (!hangoutDetailsId) {
      return NextResponse.json({ error: 'Hangout details not found' }, { status: 404 })
    }

    // Get all polls for this hangout
    const polls = await db.polls.findMany({
      where: {
        hangoutId: hangoutDetailsId
      },
      include: {
        votes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(createSuccessResponse(polls, 'Polls fetched successfully'))

  } catch (error) {
    logger.error('Error fetching polls:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch polls', error.message),
      { status: 500 }
    )
  }
}

// POST /api/hangouts/[id]/polls - Create a poll for a specific hangout
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: hangoutId } = await params
    const body = await request.json()
    
    // Debug logging
    // console.log('Poll creation request body:', JSON.stringify(body, null, 2); // Removed for production)
    
    // Get the hangout details ID from the content ID
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: { 
        hangout_details: true,
        content_participants: true
      }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    // Polls must use hangout_details ID due to foreign key constraint
    const hangoutDetailsId = hangout.hangout_details?.id
    if (!hangoutDetailsId) {
      return NextResponse.json({ error: 'Hangout details not found' }, { status: 404 })
    }
    const validatedData = CreatePollSchema.parse(body)

    // Check if user has permission to create polls in this hangout
    // (hangout_details check removed - we'll use content ID directly)

    // Check if user is participant or creator
    const isParticipant = hangout.content_participants.some(p => p.userId === user.id)
    const isCreator = hangout.creatorId === user.id

    if (!isParticipant && !isCreator) {
      return NextResponse.json({ error: 'Not authorized to create polls in this hangout' }, { status: 403 })
    }

    // Create poll with simplified schema
    const result = await db.$transaction(async (tx) => {
      // Create poll
      const poll = await tx.polls.create({
        data: {
          id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          hangoutId: hangoutDetailsId,
          creatorId: user.id,
          title: validatedData.title,
          description: validatedData.description,
          options: validatedData.options, // Store options as JSON
          allowMultiple: validatedData.allowMultiple,
          isAnonymous: validatedData.isAnonymous,
          status: 'ACTIVE',
          visibility: validatedData.visibility,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      })

      return { poll }
    })

    return NextResponse.json(createSuccessResponse(result.poll, 'Poll created successfully'), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.errors)), { status: 400 })
    }
    logger.error('Error creating poll:', error);
    logger.error('Error stack:', error.stack);
    return NextResponse.json(createErrorResponse('Failed to create poll', error.message), { status: 500 })
  }
}