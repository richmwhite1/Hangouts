import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/hangouts/[id]/final-plan - Get the finalized plan
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
    console.error('❌ Error fetching final plan:', error)
    return NextResponse.json({ error: 'Failed to fetch final plan' }, { status: 500 })
  }
}





