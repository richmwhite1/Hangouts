import { db } from '@/lib/db'
import { auditLogger } from '@/lib/audit-logger'
import { rbac } from '@/lib/rbac'
import { UserRole, PrivacyLevel } from '@prisma/client'
import { QueryCacheService, CacheUtils, CacheKeys, CACHE_TTL, CACHE_TAGS } from '@/lib/cache'

import { logger } from '@/lib/logger'
export interface ServiceContext {
  userId: string
  userRole: UserRole
  ipAddress?: string
  userAgent?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterOptions {
  [key: string]: any
}

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export abstract class BaseService {
  protected db = db
  protected auditLogger = auditLogger
  protected rbac = rbac

  constructor(protected context: ServiceContext) {}

  /**
   * Check if user has permission for an action
   */
  protected async checkPermission(permission: string): Promise<boolean> {
    try {
      return await this.rbac.hasPermission(this.context.userId, permission as any)
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  protected async checkAnyPermission(permissions: string[]): Promise<boolean> {
    try {
      return await this.rbac.hasAnyPermission(this.context.userId, permissions as any[])
    } catch (error) {
      logger.error('Permission check failed:', error);
      return false
    }
  }

  /**
   * Log data access for audit purposes
   */
  protected async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    details?: any
  ): Promise<void> {
    try {
      await this.auditLogger.logDataAccess(
        action,
        entityType,
        this.context.userId,
        entityId,
        this.context.ipAddress || 'unknown',
        this.context.userAgent,
        details
      )
    } catch (error) {
      logger.error('Failed to log data access:', error);
    }
  }

  /**
   * Log user action for audit purposes
   */
  protected async logAction(
    action: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      await this.auditLogger.logAction(
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        this.context.userId,
        this.context.ipAddress || 'unknown',
        this.context.userAgent
      )
    } catch (error) {
      logger.error('Failed to log action:', error);
    }
  }

  /**
   * Create a success result
   */
  protected createSuccessResult<T>(
    data: T,
    message?: string,
    pagination?: any
  ): ServiceResult<T> {
    return {
      success: true,
      data,
      message,
      pagination
    }
  }

  /**
   * Create an error result
   */
  protected createErrorResult(error: string, message?: string): ServiceResult<never> {
    return {
      success: false,
      error,
      message
    }
  }

  /**
   * Calculate pagination metadata
   */
  protected calculatePagination(
    page: number,
    limit: number,
    total: number
  ): { page: number; limit: number; total: number; totalPages: number } {
    const totalPages = Math.ceil(total / limit)
    return {
      page,
      limit,
      total,
      totalPages
    }
  }

  /**
   * Apply privacy filtering based on user relationship
   */
  protected async applyPrivacyFilter<T extends { privacyLevel: PrivacyLevel; creatorId: string }>(
    items: T[],
    userId: string
  ): Promise<T[]> {
    // Get user's friends for privacy filtering
    const friendships = await this.db.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    })

    const friendIds = new Set(
      friendships.map(f => f.user1Id === userId ? f.user2Id : f.user1Id)
    )

    return items.filter(item => {
      switch (item.privacyLevel) {
        case 'PUBLIC':
          return true
        case 'FRIENDS_ONLY':
          return item.creatorId === userId || friendIds.has(item.creatorId)
        case 'PRIVATE':
          return item.creatorId === userId
        default:
          return false
      }
    })
  }

  /**
   * Execute a database transaction
   */
  protected async executeTransaction<T>(
    operation: (tx: any) => Promise<T>
  ): Promise<T> {
    return await this.db.$transaction(operation)
  }

  /**
   * Validate input data using a schema
   */
  protected validateInput<T>(data: any, schema: any): T {
    try {
      return schema.parse(data)
    } catch (error) {
      throw new Error(`Validation failed: ${error}`)
    }
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: any, operation: string): ServiceResult<never> {
    logger.error(`${operation} error:`, error);
    
    if (error instanceof Error) {
      return this.createErrorResult(
        error.message,
        `Failed to ${operation.toLowerCase()}`
      )
    }

    return this.createErrorResult(
      'Unknown error occurred',
      `Failed to ${operation.toLowerCase()}`
    )
  }

  /**
   * Check if user can access a specific resource
   */
  protected async canAccessResource(
    resourceType: 'hangout' | 'user' | 'group' | 'comment' | 'poll',
    resourceId: string,
    action: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
  ): Promise<boolean> {
    try {
      const access = await this.rbac.canAccessResource(
        this.context.userId,
        resourceType,
        resourceId,
        action
      )
      return access.granted
    } catch (error) {
      logger.error('Resource access check failed:', error);
      return false
    }
  }

  /**
   * Get user's friends for relationship-based filtering
   */
  protected async getUserFriends(userId: string): Promise<string[]> {
    try {
      const friendships = await this.db.friendship.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        }
      })

      return friendships.map(f => 
        f.user1Id === userId ? f.user2Id : f.user1Id
      )
    } catch (error) {
      logger.error('Failed to get user friends:', error);
      return []
    }
  }

  /**
   * Check if two users are friends
   */
  protected async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendship = await this.db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: userId1, user2Id: userId2 },
            { user1Id: userId2, user2Id: userId1 }
          ]
        }
      })

      return !!friendship
    } catch (error) {
      logger.error('Failed to check friendship:', error);
      return false
    }
  }

  // ============================================================================
  // CACHING METHODS
  // ============================================================================

  /**
   * Cache a query result
   */
  protected async cacheQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    return await QueryCacheService.cacheQuery(key, queryFn, options)
  }

  /**
   * Cache user-related query
   */
  protected async cacheUserQuery<T>(
    userId: string,
    queryType: string,
    queryFn: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    return await QueryCacheService.cacheUserQuery(userId, queryType, queryFn, options)
  }

  /**
   * Cache hangout-related query
   */
  protected async cacheHangoutQuery<T>(
    hangoutId: string,
    queryType: string,
    queryFn: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    return await QueryCacheService.cacheHangoutQuery(hangoutId, queryType, queryFn, options)
  }

  /**
   * Cache search query
   */
  protected async cacheSearchQuery<T>(
    searchType: string,
    searchParams: Record<string, any>,
    queryFn: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    return await QueryCacheService.cacheSearchQuery(searchType, searchParams, queryFn, options)
  }

  /**
   * Cache paginated query
   */
  protected async cachePaginatedQuery<T>(
    baseKey: string,
    page: number,
    limit: number,
    queryFn: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    return await QueryCacheService.cachePaginatedQuery(baseKey, page, limit, queryFn, options)
  }

  /**
   * Invalidate user cache
   */
  protected async invalidateUserCache(userId: string): Promise<void> {
    await CacheUtils.invalidateUser(userId)
    await QueryCacheService.invalidateUserQueries(userId)
  }

  /**
   * Invalidate hangout cache
   */
  protected async invalidateHangoutCache(hangoutId: string): Promise<void> {
    await CacheUtils.invalidateHangout(hangoutId)
    await QueryCacheService.invalidateHangoutQueries(hangoutId)
  }

  /**
   * Invalidate poll cache
   */
  protected async invalidatePollCache(pollId: string): Promise<void> {
    await CacheUtils.invalidatePoll(pollId)
  }

  /**
   * Invalidate group cache
   */
  protected async invalidateGroupCache(groupId: string): Promise<void> {
    await CacheUtils.invalidateGroup(groupId)
  }

  /**
   * Invalidate friends cache
   */
  protected async invalidateFriendsCache(userId: string): Promise<void> {
    await CacheUtils.invalidateFriends(userId)
  }

  /**
   * Warm cache with data
   */
  protected async warmCache(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    await CacheUtils.getOrSet(key, async () => data, { ttl })
  }

  /**
   * Get cached data or compute
   */
  protected async getCachedOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<T> {
    return await CacheUtils.getOrSet(key, computeFn, options)
  }
}
