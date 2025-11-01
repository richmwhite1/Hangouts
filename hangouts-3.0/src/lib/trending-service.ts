import { db } from '@/lib/db'
import { ContentType } from '@prisma/client'

interface TrendingScore {
  contentId: string
  score: number
  content: any
}

interface TrendingOptions {
  location?: string
  category?: string
  limit?: number
  type?: ContentType
}

export class TrendingService {
  // Cache for trending results (15 minutes)
  private static cache: Map<string, { data: any[], timestamp: number }> = new Map()
  private static CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

  /**
   * Calculate trending score for content
   * Score = (recentViews * 0.3) + (recentRSVPs * 0.4) + (recentShares * 0.2) + (engagementRate * 0.1) - timeDecay
   */
  private static calculateTrendingScore(content: any): number {
    const now = new Date()
    const createdAt = new Date(content.createdAt)
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    // Time decay: content loses 10% score per day
    const timeDecay = daysSinceCreation * 0.1

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Count recent RSVPs
    const recentRSVPs = content.rsvps?.filter((r: any) => 
      new Date(r.createdAt) > sevenDaysAgo && r.status === 'ATTENDING'
    ).length || 0

    // Count recent shares
    const recentShares = content.content_shares?.filter((s: any) => 
      new Date(s.sharedAt) > sevenDaysAgo
    ).length || 0

    // Use viewCount (stored in DB)
    const recentViews = content.viewCount || 0

    // Engagement rate: (saves + likes + comments) / views
    const saves = content.eventSaves?.length || 0
    const likes = content.content_likes?.length || 0
    const comments = content.comments?.length || 0
    const totalEngagement = saves + likes + comments
    const engagementRate = recentViews > 0 ? totalEngagement / recentViews : 0

    // Calculate weighted score
    const score = 
      (recentViews * 0.3) +
      (recentRSVPs * 0.4) +
      (recentShares * 0.2) +
      (engagementRate * 100 * 0.1) - // Scale engagement rate
      timeDecay

    return Math.max(0, score) // Ensure non-negative
  }

  /**
   * Get trending content with optional filters
   */
  static async getTrending(options: TrendingOptions = {}): Promise<any[]> {
    const { location, category, limit = 20, type } = options

    // Check cache
    const cacheKey = JSON.stringify(options)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // Build where clause
      const whereClause: any = {
        status: 'PUBLISHED',
        OR: [
          { isPublic: true },
          { privacyLevel: 'PUBLIC' }
        ]
      }

      if (type) {
        whereClause.type = type
      }

      if (location) {
        whereClause.OR = [
          { city: { contains: location, mode: 'insensitive' } },
          { state: { contains: location, mode: 'insensitive' } },
          { location: { contains: location, mode: 'insensitive' } }
        ]
      }

      // Fetch recent content (last 30 days) with engagement metrics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const content = await db.content.findMany({
        where: {
          ...whereClause,
          createdAt: { gte: thirtyDaysAgo }
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
          rsvps: {
            select: {
              status: true,
              createdAt: true
            }
          },
          content_shares: {
            select: {
              sharedAt: true
            }
          },
          eventSaves: {
            select: {
              id: true
            }
          },
          content_likes: {
            select: {
              id: true
            }
          },
          comments: {
            select: {
              id: true
            }
          }
        },
        take: 100 // Get more than needed for scoring
      })

      // Calculate scores and sort
      const scored: TrendingScore[] = content.map(item => ({
        contentId: item.id,
        score: this.calculateTrendingScore(item),
        content: item
      }))

      scored.sort((a, b) => b.score - a.score)

      // Take top N
      const trending = scored.slice(0, limit).map(s => s.content)

      // Cache results
      this.cache.set(cacheKey, {
        data: trending,
        timestamp: Date.now()
      })

      return trending
    } catch (error) {
      console.error('Error calculating trending content:', error)
      return []
    }
  }

  /**
   * Get trending events only
   */
  static async getTrendingEvents(location?: string, limit = 20): Promise<any[]> {
    return this.getTrending({ location, limit, type: 'EVENT' })
  }

  /**
   * Get trending hangouts only
   */
  static async getTrendingHangouts(location?: string, limit = 20): Promise<any[]> {
    return this.getTrending({ location, limit, type: 'HANGOUT' })
  }

  /**
   * Increment view count for content
   */
  static async incrementViewCount(contentId: string): Promise<void> {
    try {
      await db.content.update({
        where: { id: contentId },
        data: {
          viewCount: { increment: 1 }
        }
      })
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  /**
   * Increment share count for content
   */
  static async incrementShareCount(contentId: string): Promise<void> {
    try {
      await db.content.update({
        where: { id: contentId },
        data: {
          shareCount: { increment: 1 }
        }
      })
    } catch (error) {
      console.error('Error incrementing share count:', error)
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache stats
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

