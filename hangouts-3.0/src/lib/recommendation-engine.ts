import { db } from '@/lib/db'
import { ContentType } from '@prisma/client'

interface UserPreferences {
  categories: Map<string, number> // category -> frequency
  locations: Map<string, number> // location -> frequency
  timePreferences: Map<number, number> // hour of day -> frequency
  priceRange: { min: number; max: number }
}

interface RecommendationScore {
  contentId: string
  score: number
  reasons: string[]
}

export class RecommendationEngine {
  // Cache for user preferences (30 minutes)
  private static preferencesCache: Map<string, { data: UserPreferences; timestamp: number }> = new Map()
  private static CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Analyze user's past behavior to build preference profile
   */
  private static async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    // Check cache
    const cached = this.preferencesCache.get(userId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    const preferences: UserPreferences = {
      categories: new Map(),
      locations: new Map(),
      timePreferences: new Map(),
      priceRange: { min: 0, max: 1000 }
    }

    try {
      // Analyze RSVPs (what events user attended/plans to attend)
      const userRSVPs = await db.rsvp.findMany({
        where: {
          userId,
          status: { in: ['ATTENDING', 'MAYBE'] }
        },
        include: {
          content: {
            select: {
              type: true,
              location: true,
              city: true,
              startTime: true,
              priceMin: true,
              priceMax: true
            }
          }
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
      })

      // Analyze saved events
      const savedEvents = await db.eventSave.findMany({
        where: { userId },
        include: {
          content: {
            select: {
              type: true,
              location: true,
              city: true,
              startTime: true,
              priceMin: true,
              priceMax: true
            }
          }
        },
        take: 50,
        orderBy: { savedAt: 'desc' }
      })

      // Combine all interactions
      const allInteractions = [
        ...userRSVPs.map(r => r.content),
        ...savedEvents.map(s => s.content)
      ]

      // Build preference profile
      let totalPrice = 0
      let priceCount = 0

      allInteractions.forEach(content => {
        // Track locations
        if (content.city) {
          const count = preferences.locations.get(content.city) || 0
          preferences.locations.set(content.city, count + 1)
        }

        // Track time preferences (hour of day)
        if (content.startTime) {
          const hour = new Date(content.startTime).getHours()
          const count = preferences.timePreferences.get(hour) || 0
          preferences.timePreferences.set(hour, count + 1)
        }

        // Track price range
        if (content.priceMin !== null && content.priceMin !== undefined) {
          totalPrice += content.priceMin
          priceCount++
        }
      })

      // Calculate average price preference
      if (priceCount > 0) {
        const avgPrice = totalPrice / priceCount
        preferences.priceRange = {
          min: Math.max(0, avgPrice * 0.5),
          max: avgPrice * 1.5
        }
      }

      // Cache preferences
      this.preferencesCache.set(userId, {
        data: preferences,
        timestamp: Date.now()
      })

      return preferences
    } catch (error) {
      console.error('Error analyzing user preferences:', error)
      return preferences
    }
  }

  /**
   * Find similar users based on shared interests (collaborative filtering)
   */
  private static async findSimilarUsers(userId: string, limit: number = 10): Promise<string[]> {
    try {
      // Get events user has interacted with
      const userEvents = await db.rsvp.findMany({
        where: {
          userId,
          status: { in: ['ATTENDING', 'MAYBE'] }
        },
        select: { contentId: true },
        take: 20
      })

      const userEventIds = userEvents.map(r => r.contentId)

      if (userEventIds.length === 0) {
        return []
      }

      // Find other users who attended similar events
      const similarUsers = await db.rsvp.findMany({
        where: {
          contentId: { in: userEventIds },
          userId: { not: userId },
          status: { in: ['ATTENDING', 'MAYBE'] }
        },
        select: {
          userId: true,
          contentId: true
        },
        take: 100
      })

      // Count overlap for each user
      const userOverlap = new Map<string, number>()
      similarUsers.forEach(rsvp => {
        const count = userOverlap.get(rsvp.userId) || 0
        userOverlap.set(rsvp.userId, count + 1)
      })

      // Sort by overlap and return top N
      const sortedUsers = Array.from(userOverlap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([userId]) => userId)

      return sortedUsers
    } catch (error) {
      console.error('Error finding similar users:', error)
      return []
    }
  }

  /**
   * Calculate recommendation score for content
   */
  private static calculateRecommendationScore(
    content: any,
    preferences: UserPreferences,
    similarUserEvents: Set<string>
  ): RecommendationScore {
    let score = 0
    const reasons: string[] = []

    // Location match (weight: 0.3)
    if (content.city && preferences.locations.has(content.city)) {
      const locationScore = (preferences.locations.get(content.city) || 0) * 0.3
      score += locationScore
      reasons.push(`Popular in ${content.city}`)
    }

    // Time preference match (weight: 0.2)
    if (content.startTime) {
      const hour = new Date(content.startTime).getHours()
      if (preferences.timePreferences.has(hour)) {
        const timeScore = (preferences.timePreferences.get(hour) || 0) * 0.2
        score += timeScore
        reasons.push('Matches your usual time')
      }
    }

    // Price range match (weight: 0.2)
    const price = content.priceMin || 0
    if (price >= preferences.priceRange.min && price <= preferences.priceRange.max) {
      score += 2 // Flat bonus for price match
      reasons.push('Within your price range')
    }

    // Similar users attended (weight: 0.3)
    if (similarUserEvents.has(content.id)) {
      score += 3 // Strong signal
      reasons.push('Popular with similar users')
    }

    // Boost for high engagement
    const engagement = (content.eventSaves?.length || 0) + (content.rsvps?.length || 0)
    if (engagement > 10) {
      score += 1
      reasons.push('Highly popular')
    }

    // Recency bonus (newer events get slight boost)
    const daysSinceCreation = (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation < 7) {
      score += 0.5
      reasons.push('Recently added')
    }

    return {
      contentId: content.id,
      score,
      reasons
    }
  }

  /**
   * Get personalized recommendations for user
   */
  static async getRecommendations(userId: string, limit: number = 20): Promise<any[]> {
    try {
      // Get user preferences
      const preferences = await this.analyzeUserPreferences(userId)

      // Find similar users
      const similarUsers = await this.findSimilarUsers(userId, 10)

      // Get events similar users attended
      const similarUserEvents = new Set<string>()
      if (similarUsers.length > 0) {
        const similarUsersRSVPs = await db.rsvp.findMany({
          where: {
            userId: { in: similarUsers },
            status: { in: ['ATTENDING', 'MAYBE'] }
          },
          select: { contentId: true },
          take: 100
        })
        similarUsersRSVPs.forEach(r => similarUserEvents.add(r.contentId))
      }

      // Get user's already interacted content (to exclude)
      const userInteractedContent = await db.rsvp.findMany({
        where: { userId },
        select: { contentId: true }
      })
      const interactedIds = new Set(userInteractedContent.map(r => r.contentId))

      // Get candidate events (public, upcoming, not already interacted with)
      const now = new Date()
      const candidates = await db.content.findMany({
        where: {
          type: 'EVENT',
          status: 'PUBLISHED',
          OR: [
            { isPublic: true },
            { privacyLevel: 'PUBLIC' }
          ],
          startTime: { gte: now },
          id: { notIn: Array.from(interactedIds) }
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
          eventSaves: {
            select: { id: true }
          },
          rsvps: {
            select: { id: true, status: true }
          }
        },
        take: 100 // Get more than needed for scoring
      })

      // Score all candidates
      const scored = candidates.map(content => {
        const scoreData = this.calculateRecommendationScore(content, preferences, similarUserEvents)
        return {
          ...scoreData,
          content
        }
      })

      // Sort by score and take top N
      scored.sort((a, b) => b.score - a.score)
      const recommendations = scored.slice(0, limit)

      return recommendations.map(r => ({
        ...r.content,
        recommendationScore: r.score,
        recommendationReasons: r.reasons
      }))
    } catch (error) {
      console.error('Error generating recommendations:', error)
      return []
    }
  }

  /**
   * Clear cache for a specific user
   */
  static clearUserCache(userId: string): void {
    this.preferencesCache.delete(userId)
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    this.preferencesCache.clear()
  }
}

