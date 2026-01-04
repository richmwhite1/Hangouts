import { BaseService, ServiceContext, ServiceResult, PaginationOptions } from './base-service'
import { Event, Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

/**
 * Event data for creation
 */
export interface CreateEventData {
    title: string
    description?: string
    latitude?: number
    longitude?: number
    startTime?: Date
    endTime?: Date
    sourceUrl?: string
    externalId?: string
    categoryTags?: string[]
    interestScore?: number
}

/**
 * Event data for updates
 */
export interface UpdateEventData {
    title?: string
    description?: string
    latitude?: number
    longitude?: number
    startTime?: Date
    endTime?: Date
    sourceUrl?: string
    externalId?: string
    categoryTags?: string[]
    interestScore?: number
}

/**
 * Filter options for event queries
 */
export interface EventFilterOptions {
    categoryTags?: string[]
    startTimeAfter?: Date
    startTimeBefore?: Date
    minInterestScore?: number
    sourceUrl?: string
}

/**
 * Location-based search options
 */
export interface LocationSearchOptions {
    latitude: number
    longitude: number
    radiusKm: number
    startTimeAfter?: Date
    startTimeBefore?: Date
    categoryTags?: string[]
    minInterestScore?: number
}

/**
 * Service for managing events with CRUD operations and geospatial queries
 */
export class EventService extends BaseService {
    constructor(context: ServiceContext) {
        super(context)
    }

    /**
     * Create a new event
     */
    async createEvent(data: CreateEventData): Promise<ServiceResult<Event>> {
        try {
            // Validate required fields
            if (!data.title || data.title.trim() === '') {
                return this.createErrorResult('Title is required')
            }

            // Check for duplicate if sourceUrl and externalId are provided
            if (data.sourceUrl && data.externalId) {
                const existing = await this.db.event.findFirst({
                    where: {
                        sourceUrl: data.sourceUrl,
                        externalId: data.externalId
                    }
                })

                if (existing) {
                    return this.createErrorResult(
                        'Event already exists with this source URL and external ID',
                        'Duplicate event detected'
                    )
                }
            }

            const event = await this.db.event.create({
                data: {
                    title: data.title,
                    description: data.description,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    sourceUrl: data.sourceUrl,
                    externalId: data.externalId,
                    categoryTags: data.categoryTags || [],
                    interestScore: data.interestScore || 0
                }
            })

            await this.logDataAccess('create', 'event', event.id, { title: event.title })

            return this.createSuccessResult(event, 'Event created successfully')
        } catch (error) {
            return this.handleError(error, 'Create event')
        }
    }

    /**
     * Get event by ID
     */
    async getEventById(id: string): Promise<ServiceResult<Event>> {
        try {
            const event = await this.db.event.findUnique({
                where: { id }
            })

            if (!event) {
                return this.createErrorResult('Event not found')
            }

            await this.logDataAccess('read', 'event', event.id, { title: event.title })

            return this.createSuccessResult(event)
        } catch (error) {
            return this.handleError(error, 'Get event')
        }
    }

    /**
     * Update an event
     */
    async updateEvent(id: string, data: UpdateEventData): Promise<ServiceResult<Event>> {
        try {
            // Check if event exists
            const existing = await this.db.event.findUnique({
                where: { id }
            })

            if (!existing) {
                return this.createErrorResult('Event not found')
            }

            const event = await this.db.event.update({
                where: { id },
                data: {
                    title: data.title,
                    description: data.description,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    sourceUrl: data.sourceUrl,
                    externalId: data.externalId,
                    categoryTags: data.categoryTags,
                    interestScore: data.interestScore,
                    updatedAt: new Date()
                }
            })

            await this.logAction('update', 'event', event.id, existing, event)

            return this.createSuccessResult(event, 'Event updated successfully')
        } catch (error) {
            return this.handleError(error, 'Update event')
        }
    }

    /**
     * Delete an event
     */
    async deleteEvent(id: string): Promise<ServiceResult<void>> {
        try {
            const existing = await this.db.event.findUnique({
                where: { id }
            })

            if (!existing) {
                return this.createErrorResult('Event not found')
            }

            await this.db.event.delete({
                where: { id }
            })

            await this.logAction('delete', 'event', id, existing, null)

            return this.createSuccessResult(undefined, 'Event deleted successfully')
        } catch (error) {
            return this.handleError(error, 'Delete event')
        }
    }

    /**
     * List events with filtering and pagination
     */
    async listEvents(
        filters: EventFilterOptions = {},
        pagination: PaginationOptions = {}
    ): Promise<ServiceResult<Event[]>> {
        try {
            const page = pagination.page || 1
            const limit = pagination.limit || 20
            const offset = pagination.offset || (page - 1) * limit

            // Build where clause
            const where: Prisma.EventWhereInput = {}

            if (filters.categoryTags && filters.categoryTags.length > 0) {
                where.categoryTags = {
                    hasSome: filters.categoryTags
                }
            }

            if (filters.startTimeAfter || filters.startTimeBefore) {
                where.startTime = {}
                if (filters.startTimeAfter) {
                    where.startTime.gte = filters.startTimeAfter
                }
                if (filters.startTimeBefore) {
                    where.startTime.lte = filters.startTimeBefore
                }
            }

            if (filters.minInterestScore !== undefined) {
                where.interestScore = {
                    gte: filters.minInterestScore
                }
            }

            if (filters.sourceUrl) {
                where.sourceUrl = filters.sourceUrl
            }

            // Get total count
            const total = await this.db.event.count({ where })

            // Get events
            const events = await this.db.event.findMany({
                where,
                orderBy: [
                    { interestScore: 'desc' },
                    { startTime: 'asc' }
                ],
                skip: offset,
                take: limit
            })

            const paginationMeta = this.calculatePagination(page, limit, total)

            return this.createSuccessResult(events, undefined, paginationMeta)
        } catch (error) {
            return this.handleError(error, 'List events')
        }
    }

    /**
     * Find nearby events using Haversine formula for distance calculation
     */
    async findNearbyEvents(
        options: LocationSearchOptions,
        pagination: PaginationOptions = {}
    ): Promise<ServiceResult<Array<Event & { distance: number }>>> {
        try {
            const page = pagination.page || 1
            const limit = pagination.limit || 20
            const offset = pagination.offset || (page - 1) * limit

            // Build additional filters
            const filters: string[] = []
            const params: any[] = [options.latitude, options.longitude, options.radiusKm]
            let paramIndex = 4

            if (options.startTimeAfter) {
                filters.push(`e.start_time >= $${paramIndex}`)
                params.push(options.startTimeAfter)
                paramIndex++
            }

            if (options.startTimeBefore) {
                filters.push(`e.start_time <= $${paramIndex}`)
                params.push(options.startTimeBefore)
                paramIndex++
            }

            if (options.categoryTags && options.categoryTags.length > 0) {
                filters.push(`e.category_tags && $${paramIndex}::text[]`)
                params.push(options.categoryTags)
                paramIndex++
            }

            if (options.minInterestScore !== undefined) {
                filters.push(`e.interest_score >= $${paramIndex}`)
                params.push(options.minInterestScore)
                paramIndex++
            }

            const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : ''

            // Use raw SQL for geospatial query with Haversine formula
            // This calculates distance in kilometers
            const query = `
        SELECT 
          e.*,
          (
            6371 * acos(
              cos(radians($1)) * 
              cos(radians(e.latitude::float)) * 
              cos(radians(e.longitude::float) - radians($2)) + 
              sin(radians($1)) * 
              sin(radians(e.latitude::float))
            )
          ) AS distance
        FROM events e
        WHERE 
          e.latitude IS NOT NULL 
          AND e.longitude IS NOT NULL
          AND (
            6371 * acos(
              cos(radians($1)) * 
              cos(radians(e.latitude::float)) * 
              cos(radians(e.longitude::float) - radians($2)) + 
              sin(radians($1)) * 
              sin(radians(e.latitude::float))
            )
          ) <= $3
          ${whereClause}
        ORDER BY distance ASC, e.interest_score DESC
        LIMIT ${limit} OFFSET ${offset}
      `

            const events = await this.db.$queryRawUnsafe<Array<Event & { distance: number }>>(
                query,
                ...params
            )

            // Get total count for pagination
            const countQuery = `
        SELECT COUNT(*) as count
        FROM events e
        WHERE 
          e.latitude IS NOT NULL 
          AND e.longitude IS NOT NULL
          AND (
            6371 * acos(
              cos(radians($1)) * 
              cos(radians(e.latitude::float)) * 
              cos(radians(e.longitude::float) - radians($2)) + 
              sin(radians($1)) * 
              sin(radians(e.latitude::float))
            )
          ) <= $3
          ${whereClause}
      `

            const countResult = await this.db.$queryRawUnsafe<Array<{ count: bigint }>>(
                countQuery,
                ...params
            )

            const total = Number(countResult[0]?.count || 0)
            const paginationMeta = this.calculatePagination(page, limit, total)

            return this.createSuccessResult(events, undefined, paginationMeta)
        } catch (error) {
            return this.handleError(error, 'Find nearby events')
        }
    }

    /**
     * Upsert event (create or update based on sourceUrl + externalId)
     * Useful for AI agents to avoid duplicates
     */
    async upsertEvent(data: CreateEventData): Promise<ServiceResult<Event>> {
        try {
            if (!data.sourceUrl || !data.externalId) {
                return this.createErrorResult(
                    'sourceUrl and externalId are required for upsert operation'
                )
            }

            if (!data.title || data.title.trim() === '') {
                return this.createErrorResult('Title is required')
            }

            const event = await this.db.event.upsert({
                where: {
                    events_source_external_unique: {
                        sourceUrl: data.sourceUrl,
                        externalId: data.externalId
                    }
                },
                create: {
                    title: data.title,
                    description: data.description,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    sourceUrl: data.sourceUrl,
                    externalId: data.externalId,
                    categoryTags: data.categoryTags || [],
                    interestScore: data.interestScore || 0
                },
                update: {
                    title: data.title,
                    description: data.description,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    categoryTags: data.categoryTags,
                    interestScore: data.interestScore,
                    updatedAt: new Date()
                }
            })

            await this.logDataAccess('create', 'event', event.id, {
                title: event.title,
                operation: 'upsert'
            })

            return this.createSuccessResult(event, 'Event upserted successfully')
        } catch (error) {
            return this.handleError(error, 'Upsert event')
        }
    }

    /**
     * Get events by category tags
     */
    async getEventsByCategory(
        categoryTags: string[],
        pagination: PaginationOptions = {}
    ): Promise<ServiceResult<Event[]>> {
        return this.listEvents({ categoryTags }, pagination)
    }

    /**
     * Get upcoming events (events starting after now)
     */
    async getUpcomingEvents(
        pagination: PaginationOptions = {}
    ): Promise<ServiceResult<Event[]>> {
        return this.listEvents(
            { startTimeAfter: new Date() },
            pagination
        )
    }

    /**
     * Search events by title or description
     */
    async searchEvents(
        searchTerm: string,
        pagination: PaginationOptions = {}
    ): Promise<ServiceResult<Event[]>> {
        try {
            const page = pagination.page || 1
            const limit = pagination.limit || 20
            const offset = pagination.offset || (page - 1) * limit

            const where: Prisma.EventWhereInput = {
                OR: [
                    {
                        title: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            }

            const total = await this.db.event.count({ where })

            const events = await this.db.event.findMany({
                where,
                orderBy: [
                    { interestScore: 'desc' },
                    { startTime: 'asc' }
                ],
                skip: offset,
                take: limit
            })

            const paginationMeta = this.calculatePagination(page, limit, total)

            return this.createSuccessResult(events, undefined, paginationMeta)
        } catch (error) {
            return this.handleError(error, 'Search events')
        }
    }
}
