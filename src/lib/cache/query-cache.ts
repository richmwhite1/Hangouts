import { CacheKeys, CACHE_TTL, CACHE_TAGS } from './cache-decorators'
import { cacheManager } from './cache-manager'
import { Prisma } from '@prisma/client'

export interface QueryCacheOptions {
  ttl?: number
  tags?: string[]
  key?: string
  skipCache?: boolean
}

export class QueryCacheService {
  /**
   * Cache Prisma query results
   */
  static async cacheQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    if (options.skipCache) {
      return await queryFn()
    }

    const key = options.key || `query:${queryKey}`
    const ttl = options.ttl || CACHE_TTL.MEDIUM
    const tags = options.tags || [CACHE_TAGS.API_RESPONSE]

    return await cacheManager.getOrSet(
      key,
      queryFn,
      { ttl, tags }
    )
  }

  /**
   * Cache user queries
   */
  static async cacheUserQuery<T>(
    userId: string,
    queryType: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const key = `user:${userId}:${queryType}`
    const ttl = options.ttl || CACHE_TTL.USER_PROFILE
    const tags = options.tags || [CACHE_TAGS.USER, CACHE_TAGS.USER_PROFILE]

    return await this.cacheQuery(key, queryFn, { ...options, ttl, tags })
  }

  /**
   * Cache hangout queries
   */
  static async cacheHangoutQuery<T>(
    hangoutId: string,
    queryType: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const key = `hangout:${hangoutId}:${queryType}`
    const ttl = options.ttl || CACHE_TTL.HANGOUT_DETAILS
    const tags = options.tags || [CACHE_TAGS.HANGOUT]

    return await this.cacheQuery(key, queryFn, { ...options, ttl, tags })
  }

  /**
   * Cache search queries
   */
  static async cacheSearchQuery<T>(
    searchType: string,
    searchParams: Record<string, any>,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const key = CacheKeys.search(JSON.stringify(searchParams), searchType)
    const ttl = options.ttl || CACHE_TTL.SEARCH_RESULTS
    const tags = options.tags || [CACHE_TAGS.SEARCH]

    return await this.cacheQuery(key, queryFn, { ...options, ttl, tags })
  }

  /**
   * Cache paginated queries
   */
  static async cachePaginatedQuery<T>(
    baseKey: string,
    page: number,
    limit: number,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const key = `${baseKey}:page:${page}:limit:${limit}`
    const ttl = options.ttl || CACHE_TTL.MEDIUM
    const tags = options.tags || [CACHE_TAGS.API_RESPONSE]

    return await this.cacheQuery(key, queryFn, { ...options, ttl, tags })
  }

  /**
   * Cache relationship queries (friends, groups, etc.)
   */
  static async cacheRelationshipQuery<T>(
    userId: string,
    relationshipType: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const key = `user:${userId}:${relationshipType}`
    const ttl = options.ttl || CACHE_TTL.USER_FRIENDS
    const tags = options.tags || [CACHE_TAGS.USER, `user:${relationshipType}`]

    return await this.cacheQuery(key, queryFn, { ...options, ttl, tags })
  }

  /**
   * Invalidate user-related queries
   */
  static async invalidateUserQueries(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}:*`,
      `query:user:${userId}:*`
    ]

    for (const pattern of patterns) {
      await cacheManager.deletePattern(pattern)
    }
  }

  /**
   * Invalidate hangout-related queries
   */
  static async invalidateHangoutQueries(hangoutId: string): Promise<void> {
    const patterns = [
      `hangout:${hangoutId}:*`,
      `query:hangout:${hangoutId}:*`
    ]

    for (const pattern of patterns) {
      await cacheManager.deletePattern(pattern)
    }
  }

  /**
   * Invalidate search queries
   */
  static async invalidateSearchQueries(searchType?: string): Promise<void> {
    const pattern = searchType ? `search:${searchType}:*` : 'search:*'
    await cacheManager.deletePattern(pattern)
  }

  /**
   * Invalidate all queries
   */
  static async invalidateAllQueries(): Promise<void> {
    const patterns = [
      'query:*',
      'user:*:*',
      'hangout:*:*',
      'search:*',
      'group:*:*',
      'poll:*:*'
    ]

    for (const pattern of patterns) {
      await cacheManager.deletePattern(pattern)
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  static async warmCache(userIds: string[]): Promise<void> {
    const warmPromises = userIds.map(async (userId) => {
      // Warm user profile cache
      await cacheManager.set(
        CacheKeys.user(userId),
        { id: userId, warmed: true },
        { ttl: CACHE_TTL.USER_PROFILE }
      )
    })

    await Promise.all(warmPromises)
  }

  /**
   * Get cache hit rate for queries
   */
  static getQueryCacheStats(): { hitRate: number; totalQueries: number } {
    const stats = cacheManager.getStats()
    return {
      hitRate: stats.hitRate,
      totalQueries: stats.hits + stats.misses
    }
  }

  /**
   * Cache complex aggregation queries
   */
  static async cacheAggregationQuery<T>(
    aggregationType: string,
    params: Record<string, any>,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const key = `aggregation:${aggregationType}:${JSON.stringify(params)}`
    const ttl = options.ttl || CACHE_TTL.LONG
    const tags = options.tags || [CACHE_TAGS.API_RESPONSE, 'aggregation']

    return await this.cacheQuery(key, queryFn, { ...options, ttl, tags })
  }

  /**
   * Cache with conditional logic
   */
  static async cacheConditional<T>(
    condition: boolean,
    key: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    if (!condition) {
      return await queryFn()
    }

    return await this.cacheQuery(key, queryFn, options)
  }

  /**
   * Cache with dependency invalidation
   */
  static async cacheWithDependencies<T>(
    key: string,
    dependencies: string[],
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    // Check if any dependencies have changed
    const dependencyKeys = dependencies.map(dep => `dep:${dep}`)
    const dependencyValues = await Promise.all(
      dependencyKeys.map(depKey => cacheManager.get(depKey))
    )

    // If any dependency is missing, invalidate and recache
    if (dependencyValues.some(value => value === null)) {
      await cacheManager.delete(key)
    }

    return await this.cacheQuery(key, queryFn, options)
  }

  /**
   * Batch cache multiple queries
   */
  static async batchCache<T>(
    queries: Array<{
      key: string
      queryFn: () => Promise<T>
      options?: QueryCacheOptions
    }>
  ): Promise<T[]> {
    const results = await Promise.all(
      queries.map(({ key, queryFn, options = {} }) =>
        this.cacheQuery(key, queryFn, options)
      )
    )

    return results
  }

  /**
   * Cache with TTL based on data freshness
   */
  static async cacheWithDynamicTTL<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlCalculator: (data: T) => number,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const data = await queryFn()
    const dynamicTTL = ttlCalculator(data)
    
    await cacheManager.set(key, data, {
      ...options,
      ttl: dynamicTTL
    })

    return data
  }
}
