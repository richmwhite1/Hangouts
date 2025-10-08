import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: contentId } = await params
    const body = await request.json()
    const { action, type = 'hangout' } = saveContentSchema.parse(body)

    // Check if content exists
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: { id: true, type: true, title: true, privacyLevel: true }
    })

    if (!content) {
      return NextResponse.json(createErrorResponse('Content not found', 'Content does not exist'), { status: 404 })
    }

    // Check if user has access to the content
    const hasAccess = content.privacyLevel === 'PUBLIC' || 
                     content.creatorId === payload.userId ||
                     (await db.content_participants.findFirst({
                       where: { contentId, userId: payload.userId }
                     })) !== null

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You do not have access to this content'), { status: 403 })
    }

    // Check if user has already saved this content
    const existingSave = await db.content_saves.findFirst({
      where: {
        contentId,
        userId: payload.userId
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
      await db.content_saves.create({
        data: {
          contentId,
          userId: payload.userId,
          savedAt: new Date()
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
      await db.content_saves.delete({
        where: {
          contentId_userId: {
            contentId,
            userId: payload.userId
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: contentId } = await params

    // Check if user has saved this content
    const savedContent = await db.content_saves.findFirst({
      where: {
        contentId,
        userId: payload.userId
      },
      select: {
        savedAt: true
      }
    })

    return NextResponse.json(createSuccessResponse(
      { saved: !!savedContent, savedAt: savedContent?.savedAt },
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