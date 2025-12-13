import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { parseHangoutInput, generateHangoutSuggestions, generateAutoCompleteSuggestions } from '@/lib/ai/gemini-client'
import { getUserFriends, getUserRecentPlaces } from '@/lib/ai/hangout-functions'
import { logger } from '@/lib/logger'

/**
 * POST /api/ai/complete-hangout
 * 
 * Use AI to parse and complete hangout details from natural language input
 * 
 * Body:
 * - input: User's natural language input
 * - action: 'parse' | 'suggest' | 'autocomplete'
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { input, action = 'parse' } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }

    // Get user context for better AI results
    const [friends, recentPlaces] = await Promise.all([
      getUserFriends(user.id),
      getUserRecentPlaces(user.id)
    ])

    const friendNames = friends.map(f => f.name)
    const context = {
      userId: user.id,
      friendNames,
      userLocation: user.location || undefined,
      recentHangouts: recentPlaces
    }

    switch (action) {
      case 'parse': {
        // Parse natural language into structured data
        const parsed = await parseHangoutInput(input, {
          friendNames: context.friendNames,
          userLocation: context.userLocation
        })

        return NextResponse.json({
          success: true,
          action: 'parse',
          result: parsed,
          input
        })
      }

      case 'suggest': {
        // Generate multiple hangout suggestions
        const suggestions = await generateHangoutSuggestions(input, context)

        return NextResponse.json({
          success: true,
          action: 'suggest',
          suggestions,
          input
        })
      }

      case 'autocomplete': {
        // Generate auto-complete suggestions
        const suggestions = await generateAutoCompleteSuggestions(input, {
          recentTitles: context.recentHangouts,
          friendNames: context.friendNames
        })

        return NextResponse.json({
          success: true,
          action: 'autocomplete',
          suggestions,
          input
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: parse, suggest, or autocomplete' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    logger.error('Error in AI complete hangout:', error)

    return NextResponse.json(
      {
        error: error.message || 'Failed to process AI request',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/complete-hangout
 * 
 * Get AI service status
 */
export async function GET() {
  try {
    const { getModelInfo, isGeminiAvailable } = await import('@/lib/ai/gemini-client')
    const info = getModelInfo()

    return NextResponse.json({
      success: true,
      available: isGeminiAvailable(),
      modelInfo: info
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      available: false,
      error: 'AI service not configured'
    })
  }
}




