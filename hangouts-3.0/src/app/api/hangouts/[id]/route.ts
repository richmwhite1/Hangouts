import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔍 Hangout API: GET request received')
  const { id: hangoutId } = await params
  console.log('🔍 Hangout ID:', hangoutId)
  
  // Log memory usage at start of request
  const memoryUsage = process.memoryUsage()
  console.log(`🧠 Memory usage - Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB, RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`)
  
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

      // Get participants and RSVPs
      const participants = await db.content_participants.findMany({
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
        orderBy: { joinedAt: 'asc' }
      })

      // Get RSVPs
      const rsvps = await db.rsvp.findMany({
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
        }
      })

      // Ensure host is always included in participants
      const hostParticipant = participants.find(p => p.userId === hangout.creatorId)
      if (!hostParticipant) {
        // Add host as participant if not already included
        const hostUser = await db.user.findUnique({
          where: { id: hangout.creatorId },
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        })
        
        if (hostUser) {
          participants.unshift({
            id: `host_${hangout.creatorId}`,
            contentId: hangoutId,
            userId: hangout.creatorId,
            role: 'CREATOR',
            canEdit: true,
            isMandatory: false,
            isCoHost: false,
            joinedAt: hangout.createdAt,
            users: hostUser
          })
        }
      }

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

        // Verify authentication using Clerk
        const { userId: clerkUserId } = await auth()
        if (!clerkUserId) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        const user = await getClerkApiUser()
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 401 }
          )
        }
      }

      // Get poll data for voting information
      console.log('🔍 Looking for poll with contentId:', hangoutId)
      const poll = await db.polls.findFirst({
        where: { contentId: hangoutId },
        include: {
          votes: true
        }
      })
      console.log('🔍 Poll found:', poll ? 'Yes' : 'No')
      if (poll) {
        console.log('🔍 Poll status:', poll.status)
        console.log('🔍 Poll options (JSON):', poll.options)
        console.log('🔍 Poll votes count:', poll.votes?.length || 0)
      }

      // Determine hangout state based on poll status
      let hangoutState = 'confirmed'
      let requiresVoting = false
      let finalizedOption = null
      let options = []
      let votes = {}
      let votingDeadline = null

      if (poll) {
        const pollOptions = Array.isArray(poll.options) ? poll.options : []
        console.log('🔍 Poll options array:', pollOptions)
        
        if (poll.status === 'ACTIVE' && pollOptions.length > 1) {
          hangoutState = 'polling'
          requiresVoting = true
          options = pollOptions.map(option => ({
            id: option.id,
            title: option.title,
            description: option.description,
            location: option.location,
            dateTime: option.dateTime,
            price: option.price,
            hangoutUrl: option.hangoutUrl,
            eventImage: option.eventImage
          }))
          votingDeadline = poll.expiresAt
          
          // Build votes object from poll votes
          votes = {}
          poll.votes.forEach(vote => {
            if (!votes[vote.userId]) {
              votes[vote.userId] = []
            }
            votes[vote.userId].push(vote.option)
          })
        } else if (poll.status === 'CONSENSUS_REACHED' && pollOptions.length > 0) {
          // Find the winning option based on votes
          const optionVoteCounts = {}
          poll.votes.forEach(vote => {
            const optionId = vote.option
            optionVoteCounts[optionId] = (optionVoteCounts[optionId] || 0) + 1
          })
          
          const winningOptionId = Object.keys(optionVoteCounts).length > 0 
            ? Object.keys(optionVoteCounts).reduce((a, b) => 
                optionVoteCounts[a] > optionVoteCounts[b] ? a : b
              )
            : null
          
          const winningOption = pollOptions.find(opt => opt.id === winningOptionId)
          if (winningOption) {
            finalizedOption = {
              id: winningOption.id,
              title: winningOption.title,
              description: winningOption.description,
              location: winningOption.location,
              dateTime: winningOption.dateTime,
              price: winningOption.price,
              hangoutUrl: winningOption.hangoutUrl,
              eventImage: winningOption.eventImage
            }
          }
        }
      }

      // Transform the data to match frontend expectations
      const transformedHangout = {
        ...hangout,
        creator: hangout.users,
        participants: participants,
        rsvps: rsvps,
        _count: {
          participants: participants.length,
          comments: 0,
          content_likes: 0,
          content_shares: 0,
          messages: 0
        },
        // Add hangout state and voting info
        state: hangoutState,
        requiresVoting: requiresVoting,
        requiresRSVP: true,
        votes: votes,
        userVotes: {},
        userPreferred: {},
        options: options,
        votingDeadline: votingDeadline,
        finalizedOption: finalizedOption || (hangoutState === 'confirmed' ? {
          id: 'hangout_basic',
          title: hangout.title,
          description: hangout.description,
          optionText: hangout.title,
          optionDescription: hangout.description,
          location: hangout.location,
          dateTime: hangout.startTime?.toISOString(),
          price: hangout.priceMin || 0,
          eventImage: hangout.image
        } : null)
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

    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Check if user is host or co-host
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        content_participants: {
          where: {
            userId: user.id,
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