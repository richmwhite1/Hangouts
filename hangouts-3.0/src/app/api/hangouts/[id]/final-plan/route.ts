import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
// GET /api/hangouts/[id]/final-plan - Get the finalized plan
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

    // Get hangout details
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        hangout_details: true
      }
    })

    if (!hangout || !hangout.hangout_details) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    const hangoutDetailsId = hangout.hangout_details.id

    // Get the final plan
    const finalPlan = await db.finalPlan.findFirst({
      where: { hangoutId: hangoutDetailsId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { finalizedAt: 'desc' }
    })

    if (!finalPlan) {
      return NextResponse.json({ error: 'No final plan found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      finalPlan: {
        id: finalPlan.id,
        title: finalPlan.title,
        description: finalPlan.description,
        optionText: finalPlan.optionText,
        optionDescription: finalPlan.optionDescription,
        metadata: finalPlan.metadata,
        consensusLevel: finalPlan.consensusLevel,
        totalVotes: finalPlan.totalVotes,
        finalizedBy: finalPlan.finalizedBy,
        finalizedAt: finalPlan.finalizedAt,
        finalizedByUser: finalPlan.users
      }
    })

  } catch (error) {
    logger.error('❌ Error fetching final plan:', error);
    return NextResponse.json({ error: 'Failed to fetch final plan' }, { status: 500 })
  }
}



























