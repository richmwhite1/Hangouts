import { BaseService, ServiceResult, PaginationOptions, SortOptions, FilterOptions } from './base-service'
import { Content, ContentType, PrivacyLevel, Prisma } from '@prisma/client'
import { z } from 'zod'
import { commonString, commonSchemas, validateCommon, commonErrors, commonSuccess } from '@/lib/validations/common'

// Validation schemas using common patterns
const createHangoutSchema = z.object({
  title: commonString.medium,
  description: commonString.description,
  type: z.enum(['HANGOUT', 'EVENT', 'COMMUNITY']),
  privacyLevel: z.enum(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']),
  location: commonString.medium.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  maxParticipants: z.number().int().positive().optional(),
  tags: z.array(commonString.short).optional(),
  imageUrl: commonString.url.optional()})

const updateHangoutSchema = createHangoutSchema.partial()

const inviteParticipantsSchema = z.object({
  userIds: z.array(commonString.cuid),
  message: commonString.long.optional()})

export interface HangoutWithDetails extends Content {
  creator: {
    id: string
    username: string
    name: string
    avatar: string
  }
  participants: Array<{
    id: string
    userId: string
    role: string
    rsvpStatus: string
    user: {
      id: string
      username: string
      name: string
      avatar: string
    }
  }>
  _count: {
    participants: number
    comments: number
    likes: number
    shares: number
  }
}

export interface HangoutSearchOptions extends PaginationOptions, SortOptions, FilterOptions {
  search?: string
  type?: ContentType
  privacyLevel?: PrivacyLevel
  creatorId?: string
  participantId?: string
  location?: string
  startDate?: string
  endDate?: string
  tags?: string[]
}

// Common include objects for database queries
const hangoutInclude = {
  creator: {
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true
    }
  },
  participants: {
    include: {
      user: {
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
      participants: true,
      comments: true,
      likes: true,
      shares: true
    }
  }
}

const hangoutWithDetailsInclude = {
  ...hangoutInclude,
  hangout_details: true
}

export class HangoutService extends BaseService {
  /**
   * Create a new hangout
   */
  async createHangout(data: any): Promise<ServiceResult<HangoutWithDetails>> {
    try {
      // Check if user can create hangouts
      const canCreate = await this.checkPermission('hangout:create')
      if (!canCreate) {
        return this.createErrorResult(commonErrors.accessDenied, 'You do not have permission to create hangouts')
      }

      // Validate input
      const validatedData = this.validateInput(data, createHangoutSchema)

      const hangout = await this.db.content.create({
        data: {
          ...validatedData,
          creatorId: this.context.userId,
          type: 'HANGOUT',
          status: 'PUBLISHED'
        },
        include: hangoutInclude
      })

      await this.logAction('create', 'hangout', hangout.id, null, validatedData)

      return this.createSuccessResult(hangout, commonSuccess.created('Hangout'))
    } catch (error) {
      return this.handleError(error, 'Create hangout')
    }
  }

  /**
   * Get hangout by ID with privacy filtering
   */
  async getHangoutById(hangoutId: string): Promise<ServiceResult<HangoutWithDetails>> {
    try {
      // Check if user can access this hangout
      const canAccess = await this.canAccessResource('hangout', hangoutId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this hangout')
      }

      // Try to get from cache first
      const hangout = await this.cacheHangoutQuery<HangoutWithDetails>(
        hangoutId,
        'hangout-details',
        async () => {
          return await this.db.content.findUnique({
            where: { id: hangoutId },
            include: hangoutInclude
          })
        }
      )

      if (!hangout) {
        return this.createErrorResult(commonErrors.notFound('Hangout'), 'The requested hangout does not exist')
      }

      // Apply privacy filtering
      const filteredHangout = await this.applyPrivacyFilter([hangout], this.context.userId)
      if (filteredHangout.length === 0) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this hangout')
      }

      await this.logDataAccess('read', 'hangout', hangoutId)

      return this.createSuccessResult(filteredHangout[0], 'Hangout retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get hangout by ID')
    }
  }

  /**
   * Search hangouts with filtering and pagination
   */
  async searchHangouts(options: HangoutSearchOptions): Promise<ServiceResult<{ hangouts: HangoutWithDetails[]; pagination: any }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        type = 'HANGOUT',
        privacyLevel,
        creatorId,
        participantId,
        location,
        startDate,
        endDate,
        tags,
        field = 'createdAt',
        direction = 'desc'
      } = options

      const offset = (page - 1) * limit

      // Create cache key for search
      const cacheKey = `hangouts:search:${JSON.stringify(options)}`

      // Try to get from cache first
      const cachedResult = await this.cacheSearchQuery<{ hangouts: HangoutWithDetails[]; pagination: any }>(
        'hangouts',
        cacheKey,
        async () => {
          // Build where clause
      const where: Prisma.ContentWhereInput = {
        type,
        status: 'PUBLISHED',
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(privacyLevel && { privacyLevel }),
        ...(creatorId && { creatorId }),
        ...(participantId && {
          participants: {
            some: { userId: participantId }
          }
        }),
        ...(location && { location: { contains: location, mode: 'insensitive' } }),
        ...(startDate && { startDate: { gte: new Date(startDate) } }),
        ...(endDate && { endDate: { lte: new Date(endDate) } }),
        ...(tags && tags.length > 0 && {
          tags: { hasSome: tags }
        })
      }

      const [hangouts, total] = await Promise.all([
        this.db.content.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            participants: {
              include: {
                user: {
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
                participants: true,
                comments: true,
                likes: true,
                shares: true
              }
            }
          },
          orderBy: { [field]: direction },
          skip: offset,
          take: limit
        }),
        this.db.content.count({ where })
      ])

      // Apply privacy filtering
      const filteredHangouts = await this.applyPrivacyFilter(hangouts, this.context.userId)

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'hangout', 'search', { 
        search, 
        filters: { type, privacyLevel, creatorId, participantId, location, startDate, endDate, tags },
        pagination 
      })

          return {
            hangouts: filteredHangouts,
            pagination
          }
        }
      )

      return this.createSuccessResult(
        cachedResult,
        'Hangouts retrieved successfully',
        cachedResult.pagination
      )
    } catch (error) {
      return this.handleError(error, 'Search hangouts')
    }
  }

  /**
   * Update hangout
   */
  async updateHangout(hangoutId: string, data: any): Promise<ServiceResult<HangoutWithDetails>> {
    try {
      // Check if user can update this hangout
      const canUpdate = await this.canAccessResource('hangout', hangoutId, 'update')
      if (!canUpdate) {
        return this.createErrorResult('Access denied', 'You do not have permission to update this hangout')
      }

      // Validate input
      const validatedData = this.validateInput(data, updateHangoutSchema)

      // Get current hangout data for audit log
      const currentHangout = await this.db.content.findUnique({
        where: { id: hangoutId },
        select: {
          title: true,
          description: true,
          privacyLevel: true,
          location: true,
          startDate: true,
          endDate: true,
          maxParticipants: true,
          tags: true,
          imageUrl: true
        }
      })

      const updatedHangout = await this.db.content.update({
        where: { id: hangoutId },
        data: validatedData,
        include: hangoutInclude
      })

      await this.logAction('update', 'hangout', hangoutId, currentHangout, validatedData)

      return this.createSuccessResult(updatedHangout, 'Hangout updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update hangout')
    }
  }

  /**
   * Delete hangout
   */
  async deleteHangout(hangoutId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can delete this hangout
      const canDelete = await this.canAccessResource('hangout', hangoutId, 'delete')
      if (!canDelete) {
        return this.createErrorResult('Access denied', 'You do not have permission to delete this hangout')
      }

      // Get current hangout data for audit log
      const currentHangout = await this.db.content.findUnique({
        where: { id: hangoutId },
        select: {
          title: true,
          creatorId: true,
          status: true
        }
      })

      await this.db.content.update({
        where: { id: hangoutId },
        data: { status: 'DELETED' }
      })

      await this.logAction('delete', 'hangout', hangoutId, currentHangout, { status: 'DELETED' })

      return this.createSuccessResult(undefined, 'Hangout deleted successfully')
    } catch (error) {
      return this.handleError(error, 'Delete hangout')
    }
  }

  /**
   * Invite participants to hangout
   */
  async inviteParticipants(hangoutId: string, data: any): Promise<ServiceResult<void>> {
    try {
      // Check if user can invite to this hangout
      const canInvite = await this.canAccessResource('hangout', hangoutId, 'invite')
      if (!canInvite) {
        return this.createErrorResult('Access denied', 'You do not have permission to invite participants to this hangout')
      }

      // Validate input
      const validatedData = this.validateInput(data, inviteParticipantsSchema)

      // Check if hangout exists and is active
      const hangout = await this.db.content.findUnique({
        where: { id: hangoutId },
        select: { id: true, status: true, maxParticipants: true, _count: { select: { participants: true } } }
      })

      if (!hangout) {
        return this.createErrorResult('Hangout not found', 'The requested hangout does not exist')
      }

      if (hangout.status !== 'PUBLISHED') {
        return this.createErrorResult('Hangout not active', 'Cannot invite participants to an inactive hangout')
      }

      // Check participant limit
      if (hangout.maxParticipants && hangout._count.participants + validatedData.userIds.length > hangout.maxParticipants) {
        return this.createErrorResult('Participant limit exceeded', 'Cannot invite more participants than the hangout limit allows')
      }

      // Add participants
      await this.db.contentParticipant.createMany({
        data: validatedData.userIds.map(userId => ({
          contentId: hangoutId,
          userId,
          role: 'PARTICIPANT',
          rsvpStatus: 'PENDING'
        })),
        skipDuplicates: true
      })

      await this.logAction('invite_participants', 'hangout', hangoutId, null, {
        invitedUserIds: validatedData.userIds,
        message: validatedData.message
      })

      return this.createSuccessResult(undefined, 'Participants invited successfully')
    } catch (error) {
      return this.handleError(error, 'Invite participants')
    }
  }

  /**
   * Update participant RSVP status
   */
  async updateRSVP(hangoutId: string, userId: string, rsvpStatus: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can update RSVP for this hangout
      const canUpdate = await this.canAccessResource('hangout', hangoutId, 'update')
      if (!canUpdate && userId !== this.context.userId) {
        return this.createErrorResult('Access denied', 'You do not have permission to update RSVP for this hangout')
      }

      const participant = await this.db.contentParticipant.findFirst({
        where: {
          contentId: hangoutId,
          userId: userId
        }
      })

      if (!participant) {
        return this.createErrorResult('Participant not found', 'User is not a participant in this hangout')
      }

      await this.db.contentParticipant.update({
        where: { id: participant.id },
        data: { rsvpStatus }
      })

      await this.logAction('update_rsvp', 'hangout', hangoutId, { rsvpStatus: participant.rsvpStatus }, { rsvpStatus })

      return this.createSuccessResult(undefined, 'RSVP status updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update RSVP')
    }
  }

  /**
   * Get hangout participants
   */
  async getHangoutParticipants(hangoutId: string): Promise<ServiceResult<any[]>> {
    try {
      // Check if user can view participants
      const canAccess = await this.canAccessResource('hangout', hangoutId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view participants of this hangout')
      }

      const participants = await this.db.contentParticipant.findMany({
        where: { contentId: hangoutId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              isActive: true,
              lastSeen: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      await this.logDataAccess('read', 'hangout_participants', hangoutId)

      return this.createSuccessResult(participants, 'Participants retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get hangout participants')
    }
  }

  /**
   * Get user's hangouts
   */
  async getUserHangouts(userId: string, options: PaginationOptions = {}): Promise<ServiceResult<{ hangouts: HangoutWithDetails[]; pagination: any }>> {
    try {
      const { page = 1, limit = 20 } = options
      const offset = (page - 1) * limit

      // Check if user can view this user's hangouts
      const canAccess = await this.canAccessResource('user', userId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this user\'s hangouts')
      }

      const [hangouts, total] = await Promise.all([
        this.db.content.findMany({
          where: {
            creatorId: userId,
            type: 'HANGOUT',
            status: 'PUBLISHED'
          },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            participants: {
              include: {
                user: {
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
                participants: true,
                comments: true,
                likes: true,
                shares: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        this.db.content.count({
          where: {
            creatorId: userId,
            type: 'HANGOUT',
            status: 'PUBLISHED'
          }
        })
      ])

      // Apply privacy filtering
      const filteredHangouts = await this.applyPrivacyFilter(hangouts, this.context.userId)

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'user_hangouts', userId, { pagination })

      return this.createSuccessResult(
        { hangouts: filteredHangouts, pagination },
        'User hangouts retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get user hangouts')
    }
  }
}



