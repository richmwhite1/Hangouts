import { db } from '@/lib/db'
import { UserRole, PrivacyLevel } from '@prisma/client'

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

  constructor(protected context: ServiceContext) {}

  /**
   * Check if user has permission for an action
   */
  protected hasPermission(action: string, resource?: string): boolean {
    // Basic permission check - can be extended
    return this.context.userRole !== 'USER' || action === 'read'
  }

  /**
   * Create success result
   */
  protected success<T>(data: T, message?: string, pagination?: any): ServiceResult<T> {
    return {
      success: true,
      data,
      message,
      pagination
    }
  }

  /**
   * Create error result
   */
  protected error(message: string, error?: string): ServiceResult<never> {
    return {
      success: false,
      error: error || message,
      message
    }
  }

  /**
   * Validate pagination options
   */
  protected validatePagination(options: PaginationOptions) {
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(100, Math.max(1, options.limit || 20))
    const offset = (page - 1) * limit

    return { page, limit, offset }
  }

  /**
   * Check if user is friend with another user
   */
  protected async isFriend(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.db.friendship.findFirst({
      where: {
        OR: [
          { userId: userId1, friendId: userId2 },
          { userId: userId2, friendId: userId1 }
        ],
        status: 'ACCEPTED'
      }
    })

    return !!friendship
  }

  /**
   * Check if user is participant in hangout
   */
  protected async isParticipant(hangoutId: string, userId: string): Promise<boolean> {
    const participant = await this.db.content_participants.findFirst({
      where: {
        contentId: hangoutId,
        userId: userId
      }
    })

    return !!participant
  }

  /**
   * Check if content is accessible to user
   */
  protected async isContentAccessible(
    contentId: string,
    userId: string,
    privacyLevel: PrivacyLevel
  ): Promise<boolean> {
    if (privacyLevel === 'PUBLIC') return true

    const content = await this.db.content.findUnique({
      where: { id: contentId },
      select: { creatorId: true }
    })

    if (!content) return false

    // Creator can always access
    if (content.creatorId === userId) return true

    if (privacyLevel === 'FRIENDS_ONLY') {
      return this.isFriend(userId, content.creatorId)
    }

    if (privacyLevel === 'PRIVATE') {
      return this.isParticipant(contentId, userId)
    }

    return false
  }
}