import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * POST /api/profile/onboarding
 * Mark onboarding as complete for current user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { completed, step } = body

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Update onboarding status
    await db.user.update({
      where: { id: user.id },
      data: {
        hasCompletedOnboarding: completed ?? true,
        onboardingStep: step ?? null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding status updated'
    })
  } catch (error) {
    console.error('Error updating onboarding status:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update onboarding status' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/profile/onboarding
 * Get onboarding status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: {
        hasCompletedOnboarding: true,
        onboardingStep: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is new (created in last 5 minutes)
    const isNewUser = new Date().getTime() - new Date(user.createdAt).getTime() < 5 * 60 * 1000

    return NextResponse.json({
      success: true,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      onboardingStep: user.onboardingStep,
      shouldShowTour: !user.hasCompletedOnboarding && isNewUser
    })
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get onboarding status' },
      { status: 500 }
    )
  }
}

