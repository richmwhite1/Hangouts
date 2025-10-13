import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
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
    // Get user from Clerk auth
    const { userId: clerkUserId } = await auth()
    let user = null
    if (clerkUserId) {
      user = await getClerkApiUser()
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
            pollVotes: {
              include: {
                users: {
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
    let options = []
    let votes = {}
    let votingDeadline = null
    let requiresVoting = false
    let hangoutState = 'confirmed'

    if (hangout.polls && hangout.polls.length > 0) {
      const poll = hangout.polls[0]
      const pollOptions = Array.isArray(poll.options) ? poll.options : []
      
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
        poll.pollVotes.forEach(vote => {
          if (!votes[vote.userId]) {
            votes[vote.userId] = []
          }
          votes[vote.userId].push(vote.optionId)
        })
      } else if (poll.status === 'CONSENSUS_REACHED' && pollOptions.length > 0) {
        // Find the winning option based on votes
        const optionVoteCounts = {}
        poll.pollVotes.forEach(vote => {
          optionVoteCounts[vote.optionId] = (optionVoteCounts[vote.optionId] || 0) + 1
        })
        
        const winningOptionId = Object.keys(optionVoteCounts).reduce((a, b) => 
          optionVoteCounts[a] > optionVoteCounts[b] ? a : b
        )
        
        const winningOption = pollOptions.find(opt => opt.id === winningOptionId)
        if (winningOption) {
          options = [{
            id: winningOption.id,
            title: winningOption.title,
            description: winningOption.description,
            location: winningOption.location,
            dateTime: winningOption.dateTime,
            price: winningOption.price,
            hangoutUrl: winningOption.hangoutUrl,
            eventImage: winningOption.eventImage
          }]
        }
      }
    }

    // Build participants array
    const participants = hangout.content_participants.map(p => ({
      id: p.id,
      userId: p.userId,
      role: p.role,
      joinedAt: p.joinedAt,
      user: p.users
    }))

    // Build RSVPs array
    const rsvps = hangout.rsvps.map(r => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      respondedAt: r.respondedAt,
      user: r.users
    }))

    // Calculate user's vote status
    const userVotes = user ? (votes[user.id] || []) : []
    const userRSVP = user ? rsvps.find(r => r.userId === user.id) : null

    // Build response
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
      userVotes,
      userRSVP: userRSVP?.status || null,
      requiresVoting,
      state: hangoutState,
      votingDeadline,
      counts: hangout._count
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    logger.error('Error fetching hangout:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch hangout data'
      },
      { status: 500 }
    )
  }
}