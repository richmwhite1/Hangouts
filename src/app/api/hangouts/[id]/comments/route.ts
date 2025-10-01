import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/hangouts/[id]/comments - Get comments for a hangout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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
    console.error('Error fetching hangout comments:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ error: 'Failed to fetch comments', details: error.message }, { status: 500 })
  }
}

// POST /api/hangouts/[id]/comments - Create a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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
        userId: payload.userId,
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
    console.error('Error creating comment:', error)
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ error: 'Failed to create comment', details: error.message }, { status: 500 })
  }
}