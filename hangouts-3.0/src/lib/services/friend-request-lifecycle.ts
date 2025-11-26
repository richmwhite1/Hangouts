import { db } from '@/lib/db'
import { FriendRequestStatus } from '@prisma/client'
import { logger } from '@/lib/logger'

/**
 * Friend Request Lifecycle Management
 * Handles cleanup and archival of old friend requests
 */
export class FriendRequestLifecycle {
  /**
   * Cleanup old friend requests based on status and age
   * 
   * Cleanup rules:
   * - ACCEPTED requests older than 30 days: Archive (optional, keep for audit)
   * - DECLINED requests older than 90 days: Archive
   * - CANCELLED requests older than 30 days: Archive
   * - PENDING requests older than 180 days: Auto-decline (optional)
   */
  static async cleanupOldRequests(options: {
    archiveAccepted?: boolean
    archiveDeclined?: boolean
    archiveCancelled?: boolean
    autoDeclineOldPending?: boolean
    dryRun?: boolean
  } = {}): Promise<{
    archived: number
    declined: number
    errors: number
  }> {
    const {
      archiveAccepted = false, // Keep accepted for audit by default
      archiveDeclined = true,
      archiveCancelled = true,
      autoDeclineOldPending = false,
      dryRun = false
    } = options

    let archived = 0
    let declined = 0
    let errors = 0

    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

      // Archive ACCEPTED requests older than 30 days (optional)
      if (archiveAccepted) {
        try {
          const acceptedRequests = await db.friendRequest.findMany({
            where: {
              status: 'ACCEPTED',
              updatedAt: { lt: thirtyDaysAgo }
            },
            select: { id: true }
          })

          if (!dryRun && acceptedRequests.length > 0) {
            // In a real implementation, you might move these to an archive table
            // For now, we'll just log them
            logger.info(`Would archive ${acceptedRequests.length} ACCEPTED requests older than 30 days`)
            archived += acceptedRequests.length
          } else if (dryRun) {
            logger.info(`[DRY RUN] Would archive ${acceptedRequests.length} ACCEPTED requests`)
            archived += acceptedRequests.length
          }
        } catch (error) {
          logger.error('Error archiving ACCEPTED requests:', error)
          errors++
        }
      }

      // Archive DECLINED requests older than 90 days
      if (archiveDeclined) {
        try {
          const declinedRequests = await db.friendRequest.findMany({
            where: {
              status: 'DECLINED',
              updatedAt: { lt: ninetyDaysAgo }
            },
            select: { id: true }
          })

          if (!dryRun && declinedRequests.length > 0) {
            // In a real implementation, you might move these to an archive table
            logger.info(`Would archive ${declinedRequests.length} DECLINED requests older than 90 days`)
            archived += declinedRequests.length
          } else if (dryRun) {
            logger.info(`[DRY RUN] Would archive ${declinedRequests.length} DECLINED requests`)
            archived += declinedRequests.length
          }
        } catch (error) {
          logger.error('Error archiving DECLINED requests:', error)
          errors++
        }
      }

      // Archive CANCELLED requests older than 30 days
      if (archiveCancelled) {
        try {
          const cancelledRequests = await db.friendRequest.findMany({
            where: {
              status: 'CANCELLED',
              updatedAt: { lt: thirtyDaysAgo }
            },
            select: { id: true }
          })

          if (!dryRun && cancelledRequests.length > 0) {
            // In a real implementation, you might move these to an archive table
            logger.info(`Would archive ${cancelledRequests.length} CANCELLED requests older than 30 days`)
            archived += cancelledRequests.length
          } else if (dryRun) {
            logger.info(`[DRY RUN] Would archive ${cancelledRequests.length} CANCELLED requests`)
            archived += cancelledRequests.length
          }
        } catch (error) {
          logger.error('Error archiving CANCELLED requests:', error)
          errors++
        }
      }

      // Auto-decline PENDING requests older than 180 days (optional)
      if (autoDeclineOldPending) {
        try {
          const oldPendingRequests = await db.friendRequest.findMany({
            where: {
              status: 'PENDING',
              createdAt: { lt: oneEightyDaysAgo }
            },
            select: { id: true }
          })

          if (!dryRun && oldPendingRequests.length > 0) {
            await db.friendRequest.updateMany({
              where: {
                id: { in: oldPendingRequests.map(r => r.id) },
                status: 'PENDING'
              },
              data: {
                status: 'DECLINED',
                updatedAt: new Date()
              }
            })
            logger.info(`Auto-declined ${oldPendingRequests.length} PENDING requests older than 180 days`)
            declined += oldPendingRequests.length
          } else if (dryRun) {
            logger.info(`[DRY RUN] Would auto-decline ${oldPendingRequests.length} PENDING requests`)
            declined += oldPendingRequests.length
          }
        } catch (error) {
          logger.error('Error auto-declining old PENDING requests:', error)
          errors++
        }
      }

      return { archived, declined, errors }
    } catch (error) {
      logger.error('Error in cleanupOldRequests:', error)
      throw error
    }
  }

  /**
   * Get statistics about friend request statuses
   */
  static async getRequestStatistics(): Promise<{
    pending: number
    accepted: number
    declined: number
    cancelled: number
    blocked: number
    total: number
  }> {
    const [pending, accepted, declined, cancelled, blocked, total] = await Promise.all([
      db.friendRequest.count({ where: { status: 'PENDING' } }),
      db.friendRequest.count({ where: { status: 'ACCEPTED' } }),
      db.friendRequest.count({ where: { status: 'DECLINED' } }),
      db.friendRequest.count({ where: { status: 'CANCELLED' } }),
      db.friendRequest.count({ where: { status: 'BLOCKED' } }),
      db.friendRequest.count()
    ])

    return {
      pending,
      accepted,
      declined,
      cancelled,
      blocked,
      total
    }
  }
}







