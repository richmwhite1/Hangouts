import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const rsvpSchema = z.object({
  status: z.enum(['YES', 'NO', 'MAYBE', 'PENDING'])
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('User not found', 'Authentication failed'), { status: 401 })
    }

    const { id } = await params
    const data = await request.json()
    const validatedData = rsvpSchema.parse(data)

    // Check if content exists
    const content = await db.content.findUnique({
      where: { id }
    })

    if (!content) {
      return NextResponse.json(createErrorResponse('Not found', 'Content not found'), { status: 404 })
    }

    // Update or create RSVP
    const rsvp = await db.rsvp.upsert({
      where: {
        contentId_userId: {
          contentId: id,
          userId: user.id
        }
      },
      update: {
        status: validatedData.status,
        respondedAt: new Date()
      },
      create: {
        id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: id,
        userId: user.id,
        status: validatedData.status,
        respondedAt: new Date()
      }
    })

    return NextResponse.json(createSuccessResponse(rsvp, 'RSVP updated successfully'))
  } catch (error) {
    logger.error('Error updating RSVP:', error)
    return NextResponse.json(createErrorResponse('Internal error', error.message), { status: 500 })
  }
}