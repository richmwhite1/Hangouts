import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: hangoutId } = await params
  
  if (!hangoutId) {
    return NextResponse.json(
      { error: 'Hangout ID is required' },
      { status: 400 }
    )
  }

  try {
    console.log('Hangout API - Starting fetch for hangout:', hangoutId)
    
    // Get user from Clerk auth (optional for public hangouts)
    const { userId: clerkUserId } = await auth()
    console.log('Hangout API - Clerk userId:', clerkUserId)
    
    let user = null
    if (clerkUserId) {
      try {
        user = await getClerkApiUser()
        console.log('Hangout API - Database user found:', user ? 'YES' : 'NO')
        // If user doesn't exist in database, create a minimal user object
        if (!user) {
          user = { id: clerkUserId }
          console.log('Hangout API - Using Clerk ID as fallback')
        }
      } catch (error) {
        console.error('Hangout API - Error getting user from Clerk:', error)
        logger.error('Error getting user from Clerk:', error)
        // Fallback to Clerk ID
        user = { id: clerkUserId }
      }
    }

    // Get hangout with all related data
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
            isActive: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                lastSeen: true,
                isActive: true
              }
            }
          }
        },
        polls: {
          include: {
            votes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        rsvps: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            messages: true,
            photos: true,
            rsvps: true
          }
        }
      }
    })

    console.log('Hangout API - Database query completed, hangout found:', hangout ? 'YES' : 'NO')
    
    if (!hangout) {
      return NextResponse.json(
        { 
          error: 'Hangout not found',
          message: 'The requested hangout does not exist or has been removed',
          hangoutId: hangoutId
        },
        { status: 404 }
      )
    }

    // Process voting data if polls exist
    let options: any[] = []
    let votes: Record<string, string[]> = {}
    let votingDeadline = null
    let requiresVoting = false
    let hangoutState = 'confirmed'

    console.log('Hangout API - Processing polls, count:', hangout.polls?.length || 0)

    if (hangout.polls && hangout.polls.length > 0) {
      const poll = hangout.polls[0]
      if (!poll) {
        console.log('Hangout API - Poll is undefined, skipping poll processing')
        return NextResponse.json({
          success: true,
          data: {
            id: hangout.id,
            title: hangout.title,
            description: hangout.description,
            location: hangout.location,
            startTime: hangout.startTime,
            endTime: hangout.endTime,
            status: hangout.status,
            privacyLevel: hangout.privacyLevel,
            creatorId: hangout.creatorId,
            createdAt: hangout.createdAt,
            updatedAt: hangout.updatedAt,
            priceMin: hangout.priceMin,
            priceMax: hangout.priceMax,
            ticketUrl: hangout.ticketUrl,
            image: hangout.image,
            weatherEnabled: hangout.weatherEnabled,
            creator: hangout.users,
            participants: hangout.content_participants.map(p => ({
              id: p.id,
              userId: p.userId,
              role: p.role,
              joinedAt: p.joinedAt,
              rsvpStatus: 'PENDING',
              canEdit: p.canEdit || p.role === 'CREATOR',
              user: p.users
            })),
            rsvps: hangout.rsvps.map(r => ({
              id: r.id,
              userId: r.userId,
              status: r.status,
              respondedAt: r.respondedAt,
              user: r.users
            })),
            options: [],
            votes: {},
            userVotes: {},
            currentUserVotes: [],
            userRSVP: null,
            requiresVoting: false,
            state: 'confirmed',
            votingDeadline: null,
            counts: hangout._count
          }
        })
      }
      
      const pollOptions = Array.isArray(poll.options) ? poll.options as any[] : []
      
      if (poll.status === 'ACTIVE' && pollOptions.length > 1) {
        hangoutState = 'polling'
        requiresVoting = true
        options = pollOptions.map((option: any) => ({
          id: option?.id || '',
          title: option?.title || '',
          description: option?.description || '',
          location: option?.location || '',
          dateTime: option?.dateTime || '',
          price: option?.price || 0,
          hangoutUrl: option?.hangoutUrl || '',
          eventImage: option?.eventImage || ''
        }))
        votingDeadline = poll.expiresAt
        
        // Build votes object from poll votes
        const votesObj: Record<string, string[]> = {}
        if (poll.votes) {
          poll.votes.forEach(vote => {
            if (!votesObj[vote.userId]) {
              votesObj[vote.userId] = []
            }
            votesObj[vote.userId]!.push(vote.option)
          })
        }
        votes = votesObj
      } else if (poll.status === 'CONSENSUS_REACHED' && pollOptions.length > 0) {
        // Find the winning option based on votes
        const optionVoteCounts = {} as Record<string, number>
        if (poll.votes) {
          poll.votes.forEach(vote => {
            optionVoteCounts[vote.option] = (optionVoteCounts[vote.option] || 0) + 1
          })
        }
        
        const winningOptionId = Object.keys(optionVoteCounts).length > 0 
          ? Object.keys(optionVoteCounts).reduce((a, b) => 
              optionVoteCounts[a]! > optionVoteCounts[b]! ? a : b
            )
          : null
        
        if (winningOptionId) {
          const winningOption = pollOptions.find((opt: any) => opt?.id === winningOptionId)
          if (winningOption) {
            options = [{
              id: winningOption.id || '',
              title: winningOption.title || '',
              description: winningOption.description || '',
              location: winningOption.location || '',
              dateTime: winningOption.dateTime || '',
              price: winningOption.price || 0,
              hangoutUrl: winningOption.hangoutUrl || '',
              eventImage: winningOption.eventImage || ''
            }]
          }
        } else {
          // No votes yet, show all options
          options = pollOptions.map((option: any) => ({
            id: option?.id || '',
            title: option?.title || '',
            description: option?.description || '',
            location: option?.location || '',
            dateTime: option?.dateTime || '',
            price: option?.price || 0,
            hangoutUrl: option?.hangoutUrl || '',
            eventImage: option?.eventImage || ''
          }))
        }
      }
    }

    // Build participants array
    const participants = hangout.content_participants.map(p => {
      const userRSVP = hangout.rsvps.find(r => r.userId === p.userId)
      return {
        id: p.id,
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt,
        rsvpStatus: userRSVP?.status || 'PENDING',
        canEdit: p.canEdit || p.role === 'CREATOR',
        user: p.users
      }
    })

    // Build RSVPs array
    const rsvps = hangout.rsvps.map(r => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      respondedAt: r.respondedAt,
      user: r.users
    }))

    // Calculate user's vote status
    const currentUserVotes = user ? ((votes as Record<string, string[]>)[user.id] || []) : []
    const userRSVP = user ? rsvps.find(r => r.userId === user.id) : null

    // Build response
    console.log('Hangout API - Building response for hangout:', hangout.id)
    
    const response = {
      id: hangout.id,
      title: hangout.title,
      description: hangout.description,
      location: hangout.location,
      startTime: hangout.startTime,
      endTime: hangout.endTime,
      status: hangout.status,
      privacyLevel: hangout.privacyLevel,
      creatorId: hangout.creatorId,
      createdAt: hangout.createdAt,
      updatedAt: hangout.updatedAt,
      priceMin: hangout.priceMin,
      priceMax: hangout.priceMax,
      ticketUrl: hangout.ticketUrl,
      image: hangout.image,
      weatherEnabled: hangout.weatherEnabled,
      creator: hangout.users,
      participants,
      rsvps,
      options,
      votes,
      userVotes: votes, // Complete userVotes object for consensus checking
      currentUserVotes, // Current user's votes array for UI
      userRSVP: userRSVP?.status || null,
      myRsvpStatus: userRSVP?.status || 'PENDING', // Add myRsvpStatus for frontend compatibility
      requiresVoting,
      votingStatus: requiresVoting ? 'open' : 'closed', // Add votingStatus for action indicators
      state: hangoutState,
      votingDeadline,
      counts: hangout._count
    }

    console.log('Hangout API - Response built successfully, returning 200')
    
    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Hangout API - Error fetching hangout:', error)
    logger.error('Error fetching hangout:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch hangout data',
        details: error instanceof Error ? error.message : 'Unknown error',
        hangoutId: hangoutId
      },
      { status: 500 }
    )
  }
}

// PUT /api/hangouts/[id] - Update hangout
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hangoutId } = await params
    
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check if hangout exists and user has edit permissions
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      include: {
        content_participants: {
          where: { userId: user.id }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json({ error: 'Hangout not found' }, { status: 404 })
    }

    // Check if user can edit (creator or co-host with edit permissions)
    const canEdit = hangout.creatorId === user.id || 
                   hangout.content_participants.some((p: any) => p.canEdit)

    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit this hangout' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    
    // Update hangout with only provided fields
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.location !== undefined) updateData.location = body.location
    if (body.latitude !== undefined) updateData.latitude = body.latitude
    if (body.longitude !== undefined) updateData.longitude = body.longitude
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime)
    if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime)
    if (body.privacyLevel !== undefined) updateData.privacyLevel = body.privacyLevel
    if (body.maxParticipants !== undefined) updateData.maxParticipants = body.maxParticipants
    if (body.weatherEnabled !== undefined) updateData.weatherEnabled = body.weatherEnabled
    if (body.image !== undefined) updateData.image = body.image

    // Update hangout
    const updatedHangout = await db.content.update({
      where: { id: hangoutId },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
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

    // Build participants array
    const participants = updatedHangout.content_participants.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      role: p.role,
      joinedAt: p.joinedAt,
      rsvpStatus: 'PENDING',
      canEdit: p.canEdit || p.role === 'CREATOR',
      user: p.users
    }))

    const response = {
      id: updatedHangout.id,
      title: updatedHangout.title,
      description: updatedHangout.description,
      image: updatedHangout.image,
      location: updatedHangout.location,
      latitude: updatedHangout.latitude,
      longitude: updatedHangout.longitude,
      startTime: updatedHangout.startTime?.toISOString(),
      endTime: updatedHangout.endTime?.toISOString(),
      privacyLevel: updatedHangout.privacyLevel,
      creatorId: updatedHangout.creatorId,
      creator: updatedHangout.users,
      participants,
      state: updatedHangout.state || 'POLLING',
      requiresVoting: false,
      options: [],
      counts: updatedHangout._count,
      createdAt: updatedHangout.createdAt.toISOString(),
      updatedAt: updatedHangout.updatedAt.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error: any) {
    logger.error('Error updating hangout:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update hangout',
        details: error.message
      },
      { status: 500 }
    )
  }
}