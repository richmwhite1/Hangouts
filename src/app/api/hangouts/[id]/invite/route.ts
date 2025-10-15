import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const InviteSchema = z.object({
  friendIds: z.array(z.string()).min(1, 'At least one friend must be selected')
})

// POST /api/hangouts/[id]/invite - Invite friends to hangout or event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: contentId } = await params
    const body = await request.json()
    const { friendIds } = InviteSchema.parse(body)

    // Check if content exists (hangout or event)
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        title: true,
        type: true,
        creatorId: true,
        maxParticipants: true
      }
    })

    if (!content) {
      return NextResponse.json({ error: 'Hangout or event not found' }, { status: 404 })
    }

    // Check if user is a participant (host or member)
    const participant = await db.content_participants.findFirst({
      where: {
        contentId: contentId,
        userId: user.id
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'You must be a participant to invite others' }, { status: 403 })
    }

    // Get existing participants to avoid duplicates
    const existingParticipants = await db.content_participants.findMany({
      where: {
        contentId: contentId,
        userId: { in: friendIds }
      },
      select: { userId: true }
    })

    const existingUserIds = existingParticipants.map(p => p.userId)
    const newFriendIds = friendIds.filter(id => !existingUserIds.includes(id))

    if (newFriendIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All selected friends are already participants',
        invited: 0
      })
    }

    // Check max participants limit
    if (content.maxParticipants) {
      const currentParticipantCount = await db.content_participants.count({
        where: { contentId: contentId }
      })

      if (currentParticipantCount + newFriendIds.length > content.maxParticipants) {
        return NextResponse.json(
          { error: 'Inviting these users would exceed the maximum participant limit' },
          { status: 400 }
        )
      }
    }

    // Add new participants
    const newParticipants = newFriendIds.map(friendId => ({
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId: contentId,
      userId: friendId,
      role: 'MEMBER',
      canEdit: false,
      isMandatory: false,
      isCoHost: false,
      joinedAt: new Date()
    }))

    await db.content_participants.createMany({
      data: newParticipants,
      skipDuplicates: true
    })

    // TODO: Send notifications to invited friends
    // This would typically involve creating notification records
    // or sending push notifications, emails, etc.

    logger.info(`Successfully invited ${newParticipants.length} friends to ${content.type} ${contentId}`)

    return NextResponse.json({
      success: true,
      message: `Successfully invited ${newParticipants.length} friend(s)`,
      invited: newParticipants.length,
      alreadyParticipants: existingUserIds.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    logger.error('Error inviting friends to hangout/event:', error);
    return NextResponse.json(
      { error: 'Failed to invite friends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



