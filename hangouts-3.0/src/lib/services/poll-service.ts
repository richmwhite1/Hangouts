import { BaseService, ServiceResult, PaginationOptions, SortOptions, FilterOptions } from './base-service'
import { Poll, PollVote, Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache'

import { logger } from '@/lib/logger'
// Validation schemas
const createPollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  options: z.array(z.union([
    z.string().min(1).max(100), // Support old string format
    z.object({
      what: z.string().min(1).max(100),
      where: z.string().max(200).optional(),
      when: z.string().max(200).optional(),
      description: z.string().max(500).optional()
    })
  ])).min(2).max(10),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
  consensusPercentage: z.number().min(1).max(100).default(70),
  minimumParticipants: z.number().min(1).default(2),
  consensusType: z.enum(['percentage', 'absolute', 'majority']).default('percentage')
})

const voteSchema = z.object({
  options: z.array(z.string()).min(1),
  preferredOption: z.string().optional()
})

const addOptionSchema = z.object({
  option: z.string().min(1).max(100)
})

export type PollWithDetails = {
  id: string
  title: string
  description: string | null
  options: PollOption[]
  allowMultiple: boolean
  isAnonymous: boolean
  expiresAt: Date | null
  createdAt: Date
  totalVotes: number
  consensusPercentage: number
  minimumParticipants: number
  consensusType: string
  isActive: boolean
  consensusReached: boolean
  consensusLevel: number
  timeToConsensus?: number
  analytics: PollAnalytics
  creator: {
    id: string
    name: string | null
    username: string
    avatar: string | null
  }
}

export type PollOption = {
  id: string
  text: string
  votes: number
  percentage: number
  voters: Array<{
    id: string
    name: string | null
    username: string
    avatar: string | null
  }>
}

export type PollAnalytics = {
  totalVotes: number
  participationRate: number
  consensusLevel: number
  timeToConsensus?: number
  trendDirection: 'up' | 'down' | 'stable'
  mostPopularOption: string
  leastPopularOption: string
  averageVotesPerOption: number
  votingVelocity: number
  consensusProgress: number
  isConsensusReached: boolean
  estimatedTimeToConsensus?: number
}

export interface PollSearchOptions extends PaginationOptions, SortOptions, FilterOptions {
  search?: string
  isActive?: boolean
  consensusReached?: boolean
  creatorId?: string
}

export class PollService extends BaseService {
  /**
   * Create a new poll
   */
  async createPoll(hangoutId: string, data: any): Promise<ServiceResult<PollWithDetails>> {
    // console.log('PollService: createPoll called with hangoutId:', hangoutId, 'data:', data); // Removed for production
    // console.log('PollService: context:', this.context); // Removed for production
    
    let validatedData: any
    try {
      validatedData = createPollSchema.parse(data)
      // console.log('PollService: validated data:', validatedData); // Removed for production
    } catch (validationError) {
      return this.handleError(validationError, 'Validate poll data')
    }

    try {
      // Check hangout access
      const hangout = await this.db.content.findUnique({
        where: { 
          id: hangoutId,
          type: 'HANGOUT'
        },
        include: {
          hangout_details: {
            select: { id: true }
          },
          content_participants: {
            where: { userId: this.context.userId },
            select: { canEdit: true, role: true }
          }
        }
      })

      // console.log('PollService: hangout found:', hangout); // Removed for production
      // console.log('PollService: hangout_details:', hangout?.hangout_details); // Removed for production

      if (!hangout) {
        return this.createErrorResult('Hangout not found', 'HANGOUT_NOT_FOUND', 404)
      }

      if (!hangout.hangout_details) {
        return this.createErrorResult('Hangout details not found', 'HANGOUT_DETAILS_NOT_FOUND', 404)
      }

      // Check permissions
      const canEdit = hangout.content_participants.length > 0 && 
        (hangout.content_participants[0].canEdit || hangout.content_participants[0].role === 'ADMIN')
      
      if (!canEdit) {
        return this.createErrorResult(
          'Insufficient permissions',
          'You do not have permission to create polls for this hangout',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      }

          // console.log('PollService: About to create poll with data:', {
          //   hangoutId: hangout.hangout_details?.id,
          //   creatorId: this.context.userId,
          //   ...validatedData
          // }); // Removed for production

      // Create poll
      const poll = await this.db.poll.create({
        data: {
          hangoutId: hangout.hangout_details?.id!,
          creatorId: this.context.userId,
          ...validatedData,
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true
                }
              }
            }
          }
        }
      })

      // console.log('PollService: Poll created successfully:', poll); // Removed for production

      // Process poll data
      const processedPoll = await this.processPollData(poll)

      await this.logAction('create_poll', 'poll', poll.id, hangoutId, {
        title: validatedData.title,
        optionsCount: validatedData.options.length,
        consensusPercentage: validatedData.consensusPercentage
      })

      // Invalidate hangout cache
      await this.invalidateHangoutCache(hangoutId)

      return this.createSuccessResult(processedPoll, 'Poll created successfully')
    } catch (error) {
      return this.handleError(error, 'Create poll')
    }
  }

  /**
   * Get polls for a hangout
   */
  async getHangoutPolls(hangoutId: string, options: PollSearchOptions = {}): Promise<ServiceResult<{ polls: PollWithDetails[]; pagination: any }>> {
    try {
      const { page = 1, limit = 50, search = '', isActive, consensusReached, field = 'createdAt', direction = 'desc' } = options
      const offset = (page - 1) * limit

      // Check hangout access
      const hangout = await this.db.content.findUnique({
        where: { 
          id: hangoutId,
          type: 'HANGOUT'
        },
        select: {
          id: true,
          privacyLevel: true,
          hangoutDetails: {
            select: { id: true }
          }
        }
      })

      if (!hangout) {
        return this.createErrorResult('Hangout not found', 'HANGOUT_NOT_FOUND', 404)
      }

      // Check privacy
      if (hangout.privacyLevel !== 'PUBLIC') {
        const hasAccess = await this.canAccessResource('hangout', hangoutId, 'read')
        if (!hasAccess) {
          return this.createErrorResult(
            'Access denied',
            'You do not have access to this hangout',
            403,
            'ACCESS_DENIED'
          )
        }
      }

      // Use caching for polls data
      const cacheKey = `hangout_polls:${hangoutId}:${JSON.stringify(options)}`
      
      const result = await this.cacheHangoutQuery(
        hangoutId,
        'polls',
        async () => {
          // Build where clause
          const where: Prisma.PollWhereInput = {
            hangoutId: hangout.hangoutDetails?.id
          }

          if (search) {
            where.OR = [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }

          if (isActive !== undefined) {
            if (isActive) {
              where.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            } else {
              where.expiresAt = { lte: new Date() }
            }
          }

          const [polls, total] = await Promise.all([
            this.db.poll.findMany({
              where,
              include: {
                creator: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true
                  }
                },
                votes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true
                      }
                    }
                  }
                }
              },
              orderBy: { [field]: direction },
              skip: offset,
              take: limit
            }),
            this.db.poll.count({ where })
          ])

          // Process polls
          const processedPolls = await Promise.all(
            polls.map(poll => this.processPollData(poll))
          )

          const pagination = this.calculatePagination(page, limit, total)

          return { polls: processedPolls, pagination }
        },
        { ttl: CACHE_TTL.HANGOUT_POLLS, tags: [CACHE_TAGS.HANGOUT_POLLS] }
      )

      await this.logDataAccess('read', 'hangout_polls', this.context.userId, hangoutId, {
        search,
        filters: { isActive, consensusReached },
        pagination: result.pagination
      })

      return this.createSuccessResult(
        result,
        'Polls retrieved successfully',
        result.pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get hangout polls')
    }
  }

  /**
   * Vote on a poll
   */
  async voteOnPoll(pollId: string, data: any): Promise<ServiceResult<PollWithDetails>> {
    const validatedData = voteSchema.parse(data)

    try {
      // Get poll details
      const poll = await this.db.poll.findUnique({
        where: { id: pollId },
        include: {
          hangoutDetails: {
            include: {
              content: {
                select: {
                  id: true,
                  type: true,
                  privacyLevel: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        }
      })

      if (!poll) {
        return this.createErrorResult('Poll not found', 'POLL_NOT_FOUND', 404)
      }

      // Check access
      const hasAccess = await this.canAccessResource('hangout', poll.hangoutDetails.content.id, 'read')
      if (!hasAccess) {
        return this.createErrorResult(
          'Access denied',
          'You do not have access to this poll',
          403,
          'ACCESS_DENIED'
        )
      }

      // Check if poll is still active
      if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
        return this.createErrorResult(
          'Poll expired',
          'This poll has expired',
          400,
          'POLL_EXPIRED'
        )
      }

      // Validate options
      const validOptions = validatedData.options.every(option => 
        poll.options.includes(option)
      )

      if (!validOptions) {
        return this.createErrorResult(
          'Invalid options',
          'One or more selected options are invalid',
          400,
          'INVALID_OPTIONS'
        )
      }

      // Check if multiple votes are allowed
      if (!poll.allowMultiple && validatedData.options.length > 1) {
        return this.createErrorResult(
          'Multiple votes not allowed',
          'Only one option can be selected for this poll',
          400,
          'MULTIPLE_VOTES_NOT_ALLOWED'
        )
      }

      // Check if user has already voted
      const existingVote = await this.db.pollVote.findUnique({
        where: {
          pollId_userId: {
            pollId,
            userId: this.context.userId
          }
        }
      })

      if (existingVote) {
        return this.createErrorResult(
          'Already voted',
          'You have already voted on this poll',
          400,
          'ALREADY_VOTED'
        )
      }

      // Create votes in transaction
      await this.db.$transaction(async (tx) => {
        const votePromises = validatedData.options.map(option =>
          tx.pollVote.create({
            data: {
              pollId,
              userId: this.context.userId,
              option,
              preferred: validatedData.preferredOption === option
            }
          })
        )

        await Promise.all(votePromises)
      })

      // Get updated poll
      const updatedPoll = await this.db.poll.findUnique({
        where: { id: pollId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true
                }
              }
            }
          }
        }
      })

      if (!updatedPoll) {
        return this.createErrorResult(
          'Update failed',
          'Failed to retrieve updated poll',
          500,
          'UPDATE_FAILED'
        )
      }

      // Process poll data
      const processedPoll = await this.processPollData(updatedPoll)

      await this.logAction('vote_poll', 'poll', pollId, poll.hangoutDetails.content.id, {
        options: validatedData.options,
        preferredOption: validatedData.preferredOption
      })

      // Invalidate caches
      await this.invalidateHangoutCache(poll.hangoutDetails.content.id)
      await this.invalidatePollCache(pollId)

      return this.createSuccessResult(processedPoll, 'Vote submitted successfully')
    } catch (error) {
      return this.handleError(error, 'Vote on poll')
    }
  }

  /**
   * Add option to poll
   */
  async addPollOption(pollId: string, data: any): Promise<ServiceResult<PollWithDetails>> {
    const validatedData = addOptionSchema.parse(data)

    try {
      // Get poll details
      const poll = await this.db.poll.findUnique({
        where: { id: pollId },
        include: {
          hangoutDetails: {
            include: {
              content: {
                select: {
                  id: true,
                  type: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        }
      })

      if (!poll) {
        return this.createErrorResult('Poll not found', 'POLL_NOT_FOUND', 404)
      }

      // Check access
      const hasAccess = await this.canAccessResource('hangout', poll.hangoutDetails.content.id, 'read')
      if (!hasAccess) {
        return this.createErrorResult(
          'Access denied',
          'You do not have access to this poll',
          403,
          'ACCESS_DENIED'
        )
      }

      // Check if poll is still active
      if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
        return this.createErrorResult(
          'Poll expired',
          'Cannot add options to an expired poll',
          400,
          'POLL_EXPIRED'
        )
      }

      // Check if option already exists
      if (poll.options.includes(validatedData.option)) {
        return this.createErrorResult(
          'Option exists',
          'This option already exists in the poll',
          400,
          'OPTION_EXISTS'
        )
      }

      // Update poll with new option
      const updatedPoll = await this.db.poll.update({
        where: { id: pollId },
        data: {
          options: [...poll.options, validatedData.option]
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true
                }
              }
            }
          }
        }
      })

      // Process poll data
      const processedPoll = await this.processPollData(updatedPoll)

      await this.logAction('add_poll_option', 'poll', pollId, poll.hangoutDetails.content.id, {
        newOption: validatedData.option
      })

      // Invalidate caches
      await this.invalidateHangoutCache(poll.hangoutDetails.content.id)
      await this.invalidatePollCache(pollId)

      return this.createSuccessResult(processedPoll, 'Option added successfully')
    } catch (error) {
      return this.handleError(error, 'Add poll option')
    }
  }

  /**
   * Check consensus and transition poll to RSVP
   */
  async checkConsensusAndTransition(pollId: string): Promise<ServiceResult<{ consensusReached: boolean; shouldTransition: boolean }>> {
    try {
      const poll = await this.db.poll.findUnique({
        where: { id: pollId },
        include: {
          hangoutDetails: {
            include: {
              content: {
                select: {
                  id: true,
                  type: true
                }
              }
            }
          },
          votes: true
        }
      })

      if (!poll) {
        return this.createErrorResult('Poll not found', 'POLL_NOT_FOUND', 404)
      }

      // Calculate consensus
      const totalVotes = poll.votes.length
      const optionVotes = poll.options.reduce((acc, option) => {
        acc[option] = poll.votes.filter(vote => vote.option === option).length
        return acc
      }, {} as Record<string, number>)

      const maxVotes = Math.max(...Object.values(optionVotes))
      const consensusLevel = totalVotes > 0 ? (maxVotes / totalVotes) * 100 : 0

      // Check consensus criteria
      let consensusReached = false
      let shouldTransition = false

      switch (poll.consensusType) {
        case 'percentage':
          consensusReached = consensusLevel >= poll.consensusPercentage
          break
        case 'absolute':
          consensusReached = maxVotes >= poll.consensusPercentage
          break
        case 'majority':
          consensusReached = maxVotes > totalVotes / 2
          break
      }

      // Check minimum participants
      const hasMinimumParticipants = totalVotes >= poll.minimumParticipants

      if (consensusReached && hasMinimumParticipants) {
        shouldTransition = true
        
        // Mark poll as completed
        await this.db.poll.update({
          where: { id: pollId },
          data: { isActive: false }
        })

        // Log transition
        await this.logAction('poll_consensus_reached', 'poll', pollId, poll.hangoutDetails.content.id, {
          consensusLevel,
          totalVotes,
          consensusType: poll.consensusType
        })

        // Invalidate caches
        await this.invalidateHangoutCache(poll.hangoutDetails.content.id)
        await this.invalidatePollCache(pollId)
      }

      return this.createSuccessResult(
        { consensusReached, shouldTransition },
        consensusReached ? 'Consensus reached' : 'Consensus not yet reached'
      )
    } catch (error) {
      return this.handleError(error, 'Check consensus and transition')
    }
  }

  /**
   * Process poll data with analytics
   */
  private async processPollData(poll: any): Promise<PollWithDetails> {
    const totalVotes = poll.votes.length
    const optionVotes = poll.options.reduce((acc: Record<string, number>, option: string) => {
      acc[option] = poll.votes.filter((vote: any) => vote.option === option).length
      return acc
    }, {})

    const maxVotes = Math.max(...Object.values(optionVotes))
    const consensusLevel = totalVotes > 0 ? (maxVotes / totalVotes) * 100 : 0

    // Calculate analytics
    const analytics: PollAnalytics = {
      totalVotes,
      participationRate: totalVotes > 0 ? (totalVotes / 10) * 100 : 0, // Mock participation rate
      consensusLevel,
      trendDirection: consensusLevel > 70 ? 'up' : consensusLevel < 30 ? 'down' : 'stable',
      mostPopularOption: poll.options.reduce((max: string, option: string) => 
        optionVotes[option] > optionVotes[max] ? option : max, poll.options[0] || ''
      ),
      leastPopularOption: poll.options.reduce((min: string, option: string) => 
        optionVotes[option] < optionVotes[min] ? option : min, poll.options[0] || ''
      ),
      averageVotesPerOption: poll.options.length > 0 ? totalVotes / poll.options.length : 0,
      votingVelocity: 2.5, // Mock velocity
      consensusProgress: (consensusLevel / poll.consensusPercentage) * 100,
      isConsensusReached: consensusLevel >= poll.consensusPercentage,
      estimatedTimeToConsensus: consensusLevel > 50 ? 2.5 : undefined
    }

    const options: PollOption[] = poll.options.map((option: string) => ({
      id: option,
      text: option,
      votes: optionVotes[option] || 0,
      percentage: totalVotes > 0 ? ((optionVotes[option] || 0) / totalVotes) * 100 : 0,
      voters: poll.isAnonymous ? [] : poll.votes
        .filter((vote: any) => vote.option === option)
        .map((vote: any) => ({
          id: vote.user.id,
          name: vote.user.name,
          username: vote.user.username,
          avatar: vote.user.avatar
        }))
    }))

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      options,
      allowMultiple: poll.allowMultiple,
      isAnonymous: poll.isAnonymous,
      expiresAt: poll.expiresAt,
      createdAt: poll.createdAt,
      totalVotes,
      consensusPercentage: poll.consensusPercentage,
      minimumParticipants: poll.minimumParticipants,
      consensusType: poll.consensusType,
      isActive: !poll.expiresAt || new Date(poll.expiresAt) > new Date(),
      consensusReached: analytics.isConsensusReached,
      consensusLevel,
      timeToConsensus: analytics.estimatedTimeToConsensus,
      analytics,
      creator: poll.creator
    }
  }
}