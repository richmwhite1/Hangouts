import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { z } from 'zod'

const saveContentSchema = z.object({
  action: z.enum(['save', 'unsave']),
  type: z.enum(['hangout', 'event', 'content']).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: contentId } = await params
    const body = await request.json()
    const { action } = saveContentSchema.parse(body)

    // Check if content exists
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: { id: true, type: true, title: true, privacyLevel: true, creatorId: true }
    })

    if (!content) {
      return NextResponse.json(createErrorResponse('Content not found', 'Content does not exist'), { status: 404 })
    }

    // Check if user has access to the content
    const hasAccess = content.privacyLevel === 'PUBLIC' || 
                     content.creatorId === user.id ||
                     (await db.content_participants.findFirst({
                       where: { contentId, userId: user.id }
                     })) !== null

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You do not have access to this content'), { status: 403 })
    }

    // Check if user has already saved this content
    const existingSave = await db.eventSave.findFirst({
      where: {
        contentId,
        userId: user.id
      }
    })

    if (action === 'save') {
      if (existingSave) {
        return NextResponse.json(createSuccessResponse(
          { saved: true, message: 'Content already saved' },
          'Content is already saved'
        ))
      }

      // Save the content
      await db.eventSave.create({
        data: {
          contentId,
          userId: user.id
        }
      })

      return NextResponse.json(createSuccessResponse(
        { saved: true, message: 'Content saved successfully' },
        'Content saved successfully'
      ))
    } else {
      if (!existingSave) {
        return NextResponse.json(createSuccessResponse(
          { saved: false, message: 'Content not saved' },
          'Content is not saved'
        ))
      }

      // Remove the save
      await db.eventSave.delete({
        where: {
          contentId_userId: {
            contentId,
            userId: user.id
          }
        }
      })

      return NextResponse.json(createSuccessResponse(
        { saved: false, message: 'Content unsaved successfully' },
        'Content unsaved successfully'
      ))
    }

  } catch (error: any) {
    console.error('Error saving content:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(createErrorResponse('Invalid request', 'Invalid request data'), { status: 400 })
    }

    return NextResponse.json(createErrorResponse(
      'Internal server error',
      'Failed to save content'
    ), { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: contentId } = await params

    // Check if user has saved this content
    const savedContent = await db.eventSave.findFirst({
      where: {
        contentId,
        userId: user.id
      },
      select: {
        createdAt: true
      }
    })

    return NextResponse.json(createSuccessResponse(
      { saved: !!savedContent, savedAt: savedContent?.createdAt },
      'Save status retrieved successfully'
    ))

  } catch (error: any) {
    console.error('Error checking save status:', error)
    return NextResponse.json(createErrorResponse(
      'Internal server error',
      'Failed to check save status'
    ), { status: 500 })
  }
}