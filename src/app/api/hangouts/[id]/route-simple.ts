import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 Hangout API: GET request received')
    const { id: hangoutId } = await params
    console.log('🔍 Hangout ID:', hangoutId)
    
    if (!hangoutId) {
      console.log('❌ Hangout ID is required')
      return NextResponse.json(
        { error: 'Hangout ID is required' },
        { status: 400 }
      )
    }

    // First check if hangout exists with a simple query
    console.log('🔍 Checking if hangout exists...')
    const hangoutExists = await db.content.findUnique({
      where: { 
        id: hangoutId,
        type: 'HANGOUT'
      },
      select: { id: true, status: true, title: true }
    })

    if (!hangoutExists) {
      console.log('❌ Hangout not found:', hangoutId)
      return NextResponse.json(
        { 
          error: 'Hangout not found',
          message: 'The requested hangout does not exist or has been removed',
          hangoutId: hangoutId
        },
        { status: 404 }
      )
    }

    console.log('✅ Hangout exists, fetching basic data...')
    
    // Get hangout with minimal data to reduce memory usage
    const hangout = await db.content.findUnique({
      where: { 
        id: hangoutId,
        type: 'HANGOUT'
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        status: true,
        privacyLevel: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
        priceMin: true,
        priceMax: true,
        ticketUrl: true,
        image: true,
        weatherEnabled: true,
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

    if (!hangout) {
      console.log('❌ Hangout data fetch failed:', hangoutId)
      return NextResponse.json(
        { 
          error: 'Hangout data unavailable',
          message: 'The hangout exists but data could not be retrieved',
          hangoutId: hangoutId
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Hangout found:', hangout.title)

    // Check if hangout is public (for unauthenticated access)
    if (hangout.privacyLevel !== 'PUBLIC') {
      // Check if user is authenticated
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'This hangout is not public' },
          { status: 403 }
        )
      }

      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }
    }

    // Transform the data to match frontend expectations (simplified)
    const transformedHangout = {
      ...hangout,
      creator: hangout.users,
      participants: [], // Empty for now to reduce memory usage
      rsvps: [], // Empty for now to reduce memory usage
      _count: {
        participants: 0,
        comments: 0,
        content_likes: 0,
        content_shares: 0,
        messages: 0
      },
      // Simplified options
      options: [],
      // Add hangout state and voting info
      state: 'confirmed',
      requiresVoting: false,
      requiresRSVP: true,
      votes: {},
      userVotes: {},
      userPreferred: {},
      finalizedOption: {
        id: 'hangout_basic',
        title: hangout.title,
        description: hangout.description,
        optionText: hangout.title,
        optionDescription: hangout.description,
        location: hangout.location,
        dateTime: hangout.startTime?.toISOString(),
        price: hangout.priceMin || 0,
        eventImage: hangout.image
      }
    }

    return NextResponse.json({
      success: true,
      hangout: transformedHangout
    })

  } catch (error) {
    console.error('❌ Hangout API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        hangoutId: hangoutId
      },
      { status: 500 }
    )
  }
}
