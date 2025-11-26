import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// GET /api/hangouts/[id]/comments - Get comments for a hangout
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

    // Get comments for this hangout
    const comments = await db.comments.findMany({
      where: { contentId: hangoutId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.text,
        createdAt: comment.createdAt,
        user: comment.users
      }))
    })
  } catch (error) {
    logger.error('Error fetching hangout comments:', error);
    logger.error('Error stack:', error.stack);
    return NextResponse.json({ error: 'Failed to fetch comments', details: error.message }, { status: 500 })
  }
}

// POST /api/hangouts/[id]/comments - Create a comment
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
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Create the comment
    const comment = await db.comments.create({
      data: {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: hangoutId,
        userId: user.id,
        text: content.trim(),
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    // Update hangout's lastActivityAt when new comment is added
    try {
      await db.content.update({
        where: { id: hangoutId },
        data: {
          lastActivityAt: new Date(),
          updatedAt: new Date()
        }
      })
    } catch (error) {
      // Log but don't fail the comment creation if hangout update fails
      logger.error('Error updating hangout lastActivityAt:', error)
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.text,
        createdAt: comment.createdAt,
        user: comment.users
      }
    })
  } catch (error) {
    logger.error('Error creating comment:', error);
    logger.error('Error details:', error.message);
    logger.error('Error stack:', error.stack);
    return NextResponse.json({ error: 'Failed to create comment', details: error.message }, { status: 500 })
  }
}