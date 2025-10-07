import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Create a timeout promise that rejects after 25 seconds
  const timeoutPromise = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'))
    }, 25000)
  })

  // Main logic wrapped in async function
  const mainLogic = async (): Promise<NextResponse> => {
    try {
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

  // Use Promise.race to add timeout protection
  try {
    return await Promise.race([mainLogic(), timeoutPromise])
  } catch (error) {
    console.error('Hangout API timeout or error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Request timeout or server error', details: errorMessage },
      { status: 504 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 Hangout API: PATCH request received')
    const { id: hangoutId } = await params
    console.log('🔍 Hangout ID:', hangoutId)
    
    if (!hangoutId) {
      return NextResponse.json(
        { error: 'Hangout ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const data = await request.json()
    console.log('🔍 PATCH data:', data)

    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
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

    // Check if user is host or co-host
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        content_participants: {
          where: {
            userId: payload.userId,
            role: { in: ['HOST', 'CO_HOST'] as any }
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(
        { error: 'Hangout not found' },
        { status: 404 }
      )
    }

    if (hangout.content_participants?.length === 0) {
      return NextResponse.json(
        { error: 'Only hosts and co-hosts can edit plan details' },
        { status: 403 }
      )
    }

    // Update hangout with new plan data
    const updatedHangout = await db.content.update({
      where: { id: hangoutId },
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: data.dateTime ? new Date(data.dateTime) : null,
        priceMin: data.price,
        priceMax: data.price,
        ticketUrl: data.hangoutUrl
      }
    })

    return NextResponse.json({
      success: true,
      hangout: updatedHangout
    })

  } catch (error) {
    console.error('❌ Hangout PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update hangout' },
      { status: 500 }
    )
  }
}