import { CacheOptions } from './cache-manager'
import { cacheManager } from './cache-manager'

import { logger } from '@/lib/logger'
/**
 * Cache key generators for different data types
 */
export class CacheKeys {
  static user(id: string): string {
    return `user:${id}`
  }

  static userProfile(id: string): string {
    return `user:profile:${id}`
  }

  static userFriends(userId: string): string {
    return `user:friends:${userId}`
  }

  static userGroups(userId: string): string {
    return `user:groups:${userId}`
  }

  static hangout(id: string): string {
    return `hangout:${id}`
  }

  static hangoutParticipants(hangoutId: string): string {
    return `hangout:participants:${hangoutId}`
  }

  static hangoutComments(hangoutId: string): string {
    return `hangout:comments:${hangoutId}`
  }

  static hangoutPolls(hangoutId: string): string {
    return `hangout:polls:${hangoutId}`
  }

  static poll(id: string): string {
    return `poll:${id}`
  }

  static pollVotes(pollId: string): string {
    return `poll:votes:${pollId}`
  }

  static group(id: string): string {
    return `group:${id}`
  }

  static groupMembers(groupId: string): string {
    return `group:members:${groupId}`
  }

  static friendRequests(userId: string, type: 'sent' | 'received'): string {
    return `friend:requests:${type}:${userId}`
  }

  static friendSuggestions(userId: string): string {
    return `friend:suggestions:${userId}`
  }

  static search(query: string, type: string): string {
    return `search:${type}:${Buffer.from(query).toString('base64')}`
  }

  static apiResponse(endpoint: string, params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    return `api:${endpoint}:${Buffer.from(paramString).toString('base64')}`
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  USER_PROFILE: 1800, // 30 minutes
  USER_FRIENDS: 900,  // 15 minutes
  USER_GROUPS: 900,   // 15 minutes
  HANGOUT_DETAILS: 600, // 10 minutes
  HANGOUT_PARTICIPANTS: 300, // 5 minutes
  HANGOUT_COMMENTS: 180, // 3 minutes
  HANGOUT_POLLS: 300, // 5 minutes
  POLL_DETAILS: 180, // 3 minutes
  POLL_VOTES: 60, // 1 minute
  GROUP_DETAILS: 1800, // 30 minutes
  GROUP_MEMBERS: 900, // 15 minutes
  FRIEND_REQUESTS: 300, // 5 minutes
  FRIEND_SUGGESTIONS: 1800, // 30 minutes
  SEARCH_RESULTS: 600, // 10 minutes
  API_RESPONSE: 300, // 5 minutes
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600 // 1 hour
} as const

/**
 * Cache tags for invalidation
 */
export const CACHE_TAGS = {
  USER: 'user',
  USER_PROFILE: 'user:profile',
  USER_FRIENDS: 'user:friends',
  USER_GROUPS: 'user:groups',
  HANGOUT: 'hangout',
  HANGOUT_PARTICIPANTS: 'hangout:participants',
  HANGOUT_COMMENTS: 'hangout:comments',
  HANGOUT_POLLS: 'hangout:polls',
  POLL: 'poll',
  POLL_VOTES: 'poll:votes',
  GROUP: 'group',
  GROUP_MEMBERS: 'group:members',
  FRIEND_REQUESTS: 'friend:requests',
  FRIEND_SUGGESTIONS: 'friend:suggestions',
  SEARCH: 'search',
  API_RESPONSE: 'api:response'
} as const

/**
 * Cache decorator for methods
 */
export function Cacheable(options: CacheOptions & { keyGenerator?: (...args: any[]) => string }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const key = options.keyGenerator ? options.keyGenerator(...args) : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`
      
      return await cacheManager.getOrSet(
        key,
        () => method.apply(this, args),
        options
      )
    }

    return descriptor
  }
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidate(tags: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args)
      
      // Invalidate cache by tags
      await cacheManager.deleteByTags(tags)
      
      return result
    }

    return descriptor
  }
}

/**
 * Cache utility functions
 */
export class CacheUtils {
  /**
   * Get cached data or compute and cache
   */
  static async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    return await cacheManager.getOrSet(key, computeFn, options)
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.USER,
      CACHE_TAGS.USER_PROFILE,
      CACHE_TAGS.USER_FRIENDS,
      CACHE_TAGS.USER_GROUPS
    ]
    await cacheManager.deleteByTags(tags)
    
    // Also delete specific user keys
    await cacheManager.delete(CacheKeys.user(userId))
    await cacheManager.delete(CacheKeys.userProfile(userId))
    await cacheManager.delete(CacheKeys.userFriends(userId))
    await cacheManager.delete(CacheKeys.userGroups(userId))
  }

  /**
   * Invalidate hangout-related cache
   */
  static async invalidateHangout(hangoutId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.HANGOUT,
      CACHE_TAGS.HANGOUT_PARTICIPANTS,
      CACHE_TAGS.HANGOUT_COMMENTS,
      CACHE_TAGS.HANGOUT_POLLS
    ]
    await cacheManager.deleteByTags(tags)
    
    // Also delete specific hangout keys
    await cacheManager.delete(CacheKeys.hangout(hangoutId))
    await cacheManager.delete(CacheKeys.hangoutParticipants(hangoutId))
    await cacheManager.delete(CacheKeys.hangoutComments(hangoutId))
    await cacheManager.delete(CacheKeys.hangoutPolls(hangoutId))
  }

  /**
   * Invalidate poll-related cache
   */
  static async invalidatePoll(pollId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.POLL,
      CACHE_TAGS.POLL_VOTES
    ]
    await cacheManager.deleteByTags(tags)
    
    // Also delete specific poll keys
    await cacheManager.delete(CacheKeys.poll(pollId))
    await cacheManager.delete(CacheKeys.pollVotes(pollId))
  }

  /**
   * Invalidate group-related cache
   */
  static async invalidateGroup(groupId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.GROUP,
      CACHE_TAGS.GROUP_MEMBERS
    ]
    await cacheManager.deleteByTags(tags)
    
    // Also delete specific group keys
    await cacheManager.delete(CacheKeys.group(groupId))
    await cacheManager.delete(CacheKeys.groupMembers(groupId))
  }

  /**
   * Invalidate friend-related cache
   */
  static async invalidateFriends(userId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.FRIEND_REQUESTS,
      CACHE_TAGS.FRIEND_SUGGESTIONS
    ]
    await cacheManager.deleteByTags(tags)
    
    // Also delete specific friend keys
    await cacheManager.delete(CacheKeys.friendRequests(userId, 'sent'))
    await cacheManager.delete(CacheKeys.friendRequests(userId, 'received'))
    await cacheManager.delete(CacheKeys.friendSuggestions(userId))
  }

  /**
   * Warm cache with user data
   */
  static async warmUserCache(userId: string, userData: any): Promise<void> {
    await Promise.all([
      cacheManager.set(CacheKeys.user(userId), userData, { ttl: CACHE_TTL.USER_PROFILE }),
      cacheManager.set(CacheKeys.userProfile(userId), userData, { ttl: CACHE_TTL.USER_PROFILE })
    ])
  }

  /**
   * Warm cache with hangout data
   */
  static async warmHangoutCache(hangoutId: string, hangoutData: any): Promise<void> {
    await cacheManager.set(CacheKeys.hangout(hangoutId), hangoutData, { ttl: CACHE_TTL.HANGOUT_DETAILS })
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    return cacheManager.getStats()
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<boolean> {
    return await cacheManager.clear()
  }

  /**
   * Preload critical data
   */
  static async preloadCriticalData(userIds: string[]): Promise<void> {
    // This would be implemented to preload frequently accessed data
    // For now, it's a placeholder for future implementation
    // console.log('Preloading critical data for users:', userIds); // Removed for production
  }
}
