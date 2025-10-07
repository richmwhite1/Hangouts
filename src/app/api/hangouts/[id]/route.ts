import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Add timeout wrapper to prevent 502 errors
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 25000) // 25 second timeout
  })

  const mainLogic = async () => {
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

      // First check if hangout exists with a simple query to avoid complex joins
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

      console.log('✅ Hangout exists, fetching full data...')
      
      // Get hangout with all related data
      const hangout = await db.content.findUnique({
      where: { 
        id: hangoutId,
        type: 'HANGOUT'
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        content_participants: {
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
          orderBy: { joinedAt: 'asc' }
        },
        polls: true,
        finalPlans: {
          orderBy: { finalizedAt: 'desc' },
          take: 1
        },
        photos: {
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
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true
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

    // Fetch RSVP data separately since it's linked to content.id
    console.log('🔍 Fetching RSVP data...')
    const rsvps = await db.rsvp.findMany({
      where: { contentId: hangout.id },
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
    }).catch(error => {
      console.error('❌ Error fetching RSVPs:', error)
      return []
    })


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

    // Get votes for polls if they exist
    let votes: Record<string, string> = {}
    let userVotes: Record<string, string[]> = {}
    let userPreferred: Record<string, string> = {}
    
    if (hangout.polls?.length > 0) {
      const pollVotes = await db.pollVote.findMany({
        where: { pollId: hangout.polls[0]?.id || '' }
      })
      
      // Process votes for consensus checking (first vote per user)
      votes = pollVotes.reduce((acc: Record<string, string>, vote) => {
        if (!acc[vote.userId]) {
          acc[vote.userId] = vote.option
        }
        return acc
      }, {} as Record<string, string>)
      
      // Process user votes for multiple voting
      pollVotes.forEach(vote => {
        if (!userVotes[vote.userId]) {
          userVotes[vote.userId] = []
        }
        userVotes[vote.userId]?.push(vote.option || '')
        
        // Track preferred votes
        if (vote.isPreferred) {
          userPreferred[vote.userId] = vote.option || ''
        }
      })
    }

    // Transform the data to match frontend expectations
    const transformedHangout = {
      ...hangout,
      creator: hangout.users,
      polls: hangout.polls, // Include polls directly
      participants: hangout.content_participants.map(p => ({
        id: p.id,
        user: p.users,
        role: p.role,
        canEdit: p.canEdit
      })),
      rsvps: rsvps.map(rsvp => ({
        id: rsvp.id,
        hangoutId: rsvp.contentId, // Map contentId to hangoutId for frontend compatibility
        userId: rsvp.userId,
        status: rsvp.status,
        respondedAt: rsvp.respondedAt,
        createdAt: rsvp.createdAt.toISOString(),
        updatedAt: rsvp.updatedAt.toISOString(),
        user: rsvp.users
      })),
      photos: hangout.photos.map(photo => ({
        id: photo.id,
        caption: photo.caption || '',
        isPublic: photo.isPublic || false,
        originalUrl: photo.originalUrl,
        thumbnailUrl: photo.thumbnailUrl || photo.originalUrl,
        smallUrl: photo.smallUrl || photo.originalUrl,
        mediumUrl: photo.mediumUrl || photo.originalUrl,
        largeUrl: photo.largeUrl || photo.originalUrl,
        originalWidth: photo.originalWidth || 1200,
        originalHeight: photo.originalHeight || 1200,
        fileSize: photo.fileSize || 0,
        createdAt: photo.createdAt.toISOString(),
        creator: {
          id: photo.users.id,
          name: photo.users.name,
          username: photo.users.username,
          avatar: photo.users.avatar
        },
        hangout: {
          id: hangout.id,
          title: hangout.title
        },
        tags: [],
        likes: [],
        _count: {
          likes: 0,
          comments: 0
        }
      })),
      _count: {
        ...hangout._count,
        participants: hangout._count.content_participants
      },
      // Transform polls to options
      options: hangout.polls?.length > 0 ? (hangout.polls[0]?.options as any[] || []).map((option, index) => ({
        id: option?.id || `option_${index}`,
        title: option?.title || '',
        description: option?.description || '',
        location: option?.location || '',
        dateTime: option?.dateTime || '',
        price: option?.price || 0,
        eventImage: option?.eventImage || ''
      })) : [],
      // Add hangout state and voting info
      state: hangout.polls?.length > 0 && hangout.polls[0]?.status === 'ACTIVE' ? 'polling' : 'confirmed',
      requiresVoting: hangout.polls?.length > 0 && hangout.polls[0]?.status === 'ACTIVE' && (hangout.polls[0]?.options as any[] || []).length > 1,
      requiresRSVP: (hangout.polls?.length > 0 && hangout.polls[0]?.status === 'CONSENSUS_REACHED') || hangout.polls?.length === 0,
      votes: votes,
      userVotes: userVotes,
      userPreferred: userPreferred,
      finalizedOption: hangout.finalPlans?.length > 0 
        ? {
            id: hangout.finalPlans[0]?.optionId,
            title: hangout.finalPlans[0]?.title,
            description: hangout.finalPlans[0]?.description,
            optionText: hangout.finalPlans[0]?.optionText,
            optionDescription: hangout.finalPlans[0]?.optionDescription,
            metadata: hangout.finalPlans[0]?.metadata,
            consensusLevel: hangout.finalPlans[0]?.consensusLevel,
            totalVotes: hangout.finalPlans[0]?.totalVotes,
            finalizedAt: hangout.finalPlans[0]?.finalizedAt
          }
        : (hangout.polls?.length > 0 && (hangout.polls[0]?.options as any[] || []).length === 1 
          ? (hangout.polls[0]?.options as any[])[0] 
          : (hangout.polls?.length === 0 
            ? {
                id: 'hangout_basic',
                title: hangout.title,
                description: hangout.description,
                optionText: hangout.title, // Use title as optionText for simple hangouts
                optionDescription: hangout.description, // Use description as optionDescription for simple hangouts
                metadata: {
                  dateTime: hangout.startTime,
                  location: hangout.location,
                  price: hangout.priceMin || 0,
                  eventImage: hangout.image,
                  hangoutUrl: hangout.ticketUrl
                }
              }
            : null))
    }

    return NextResponse.json({
      success: true,
      hangout: transformedHangout
    })

    } catch (error) {
      console.error('Error fetching hangout:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : 'No stack trace'
      console.error('Error details:', errorMessage)
      console.error('Error stack:', errorStack)
      return NextResponse.json(
        { error: 'Failed to fetch hangout', details: errorMessage },
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
    const { id: hangoutId } = await params
    
    if (!hangoutId) {
      return NextResponse.json(
        { error: 'Hangout ID is required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
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
      hangout: updatedHangout,
      message: 'Plan details updated successfully'
    })
  } catch (error) {
    console.error('Error updating hangout:', error)
    return NextResponse.json(
      { error: 'Failed to update hangout' },
      { status: 500 }
    )
  }
}