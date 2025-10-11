import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

import { logger } from '@/lib/logger'
const likeContentSchema = z.object({
  action: z.enum(['like', 'unlike'])
})

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

    const { id: contentId } = await params
    const body = await request.json()
    const { action } = likeContentSchema.parse(body)

    // Check if content exists
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: { 
        id: true, 
        type: true, 
        title: true, 
        privacyLevel: true, 
        creatorId: true 
      }
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Check if user has access to the content
    const hasAccess = content.privacyLevel === 'PUBLIC' || 
                     content.creatorId === user.id ||
                     (await db.content_participants.findFirst({
                       where: { contentId, userId: user.id }
                     })) !== null

    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have access to this content' }, { status: 403 })
    }

    // Check if user has already liked this content
    const existingLike = await db.content_likes.findFirst({
      where: {
        contentId,
        userId: user.id
      }
    })

    if (action === 'like') {
      if (existingLike) {
        return NextResponse.json({ 
          success: true, 
          liked: true, 
          message: 'Content already liked' 
        })
      }

      // Like the content
      await db.content_likes.create({
        data: {
          id: `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId,
          userId: user.id
        }
      })

      return NextResponse.json({ 
        success: true, 
        liked: true, 
        message: 'Content liked successfully' 
      })
    } else {
      if (!existingLike) {
        return NextResponse.json({ 
          success: true, 
          liked: false, 
          message: 'Content not liked' 
        })
      }

      // Remove the like
      await db.content_likes.delete({
        where: {
          contentId_userId: {
            contentId,
            userId: user.id
          }
        }
      })

      return NextResponse.json({ 
        success: true, 
        liked: false, 
        message: 'Content unliked successfully' 
      })
    }

  } catch (error: any) {
    logger.error('Error liking content:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to like content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: contentId } = await params

    // Check if user has liked this content
    const existingLike = await db.content_likes.findFirst({
      where: {
        contentId,
        userId: user.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      liked: !!existingLike 
    })

  } catch (error: any) {
    logger.error('Error checking like status:', error);
    return NextResponse.json({ 
      error: 'Failed to check like status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
