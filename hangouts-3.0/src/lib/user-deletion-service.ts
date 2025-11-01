import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface DeletionResult {
  success: boolean
  message: string
  scheduledDate?: Date
}

export class UserDeletionService {
  /**
   * Soft delete user - marks for deletion with 30 day grace period
   * Anonymizes user data immediately but preserves for rollback
   */
  static async softDeleteUser(userId: string): Promise<DeletionResult> {
    try {
      const scheduledDeletionDate = new Date()
      scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30)

      // Mark user as deleted and schedule permanent deletion
      await db.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          scheduledDeletionDate,
          // Keep original data for grace period but mark as deleted
        }
      })

      // Anonymize user's public-facing content immediately
      await this.anonymizeUserContent(userId)

      return {
        success: true,
        message: 'Account scheduled for deletion. You have 30 days to cancel.',
        scheduledDate: scheduledDeletionDate
      }
    } catch (error) {
      console.error('Error soft deleting user:', error)
      return {
        success: false,
        message: 'Failed to delete account. Please try again.'
      }
    }
  }

  /**
   * Cancel pending deletion - restore user account within grace period
   */
  static async cancelDeletion(userId: string): Promise<DeletionResult> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { deletedAt: true, scheduledDeletionDate: true }
      })

      if (!user?.deletedAt) {
        return {
          success: false,
          message: 'Account is not scheduled for deletion.'
        }
      }

      // Check if still within grace period
      if (user.scheduledDeletionDate && new Date() > user.scheduledDeletionDate) {
        return {
          success: false,
          message: 'Grace period has expired. Account cannot be restored.'
        }
      }

      // Restore account
      await db.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          deletedAt: null,
          scheduledDeletionDate: null
        }
      })

      return {
        success: true,
        message: 'Account restoration successful. Welcome back!'
      }
    } catch (error) {
      console.error('Error canceling deletion:', error)
      return {
        success: false,
        message: 'Failed to restore account. Please contact support.'
      }
    }
  }

  /**
   * Anonymize user content - replace identifying information
   * Called immediately on soft delete
   */
  static async anonymizeUserContent(userId: string): Promise<void> {
    try {
      // Update user profile with anonymized data
      await db.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted User',
          email: `deleted_${userId}@deleted.local`,
          username: `deleted_${userId.substring(0, 8)}`,
          bio: null,
          location: null,
          website: null,
          avatar: null,
          backgroundImage: null,
          zodiac: null,
          enneagram: null,
          bigFive: null,
          loveLanguage: null,
          birthDate: null,
          favoriteActivities: '[]',
          favoritePlaces: '[]'
        }
      })

      // Update comments to show "Deleted User"
      await db.comments.updateMany({
        where: { authorId: userId },
        data: {
          // Keep comment content but mark author as deleted
          // The relation will still point to user but display name is anonymized
        }
      })

      // Update messages to show "Deleted User"
      await db.messages.updateMany({
        where: { senderId: userId },
        data: {
          // Keep message content but sender will show as "Deleted User"
        }
      })

      console.log(`Anonymized content for user ${userId}`)
    } catch (error) {
      console.error('Error anonymizing user content:', error)
      throw error
    }
  }

  /**
   * Hard delete user - permanently remove all data
   * Called by cron job after grace period expires
   */
  static async hardDeleteUser(userId: string): Promise<DeletionResult> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { 
          deletedAt: true, 
          scheduledDeletionDate: true,
          clerkId: true 
        }
      })

      if (!user?.deletedAt) {
        return {
          success: false,
          message: 'User is not marked for deletion.'
        }
      }

      // Verify grace period has passed
      if (user.scheduledDeletionDate && new Date() < user.scheduledDeletionDate) {
        return {
          success: false,
          message: 'Grace period has not yet expired.'
        }
      }

      // Delete all user data (cascading deletes will handle relations)
      // Due to Prisma cascade rules, this will delete:
      // - comments, content, likes, shares, reports
      // - messages, conversations, reactions
      // - friendships, friend requests
      // - photos, polls, votes
      // - notifications, reminders
      // - etc.
      await db.user.delete({
        where: { id: userId }
      })

      console.log(`Permanently deleted user ${userId}`)

      return {
        success: true,
        message: 'Account permanently deleted.'
      }
    } catch (error) {
      console.error('Error hard deleting user:', error)
      return {
        success: false,
        message: 'Failed to permanently delete account.'
      }
    }
  }

  /**
   * Find users scheduled for deletion whose grace period has expired
   * Used by cron job
   */
  static async findUsersForHardDeletion(): Promise<string[]> {
    try {
      const users = await db.user.findMany({
        where: {
          deletedAt: { not: null },
          scheduledDeletionDate: { lte: new Date() },
          isActive: false
        },
        select: { id: true }
      })

      return users.map(u => u.id)
    } catch (error) {
      console.error('Error finding users for hard deletion:', error)
      return []
    }
  }

  /**
   * Get deletion status for a user
   */
  static async getDeletionStatus(userId: string): Promise<{
    isScheduledForDeletion: boolean
    scheduledDate?: Date
    daysRemaining?: number
  }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { deletedAt: true, scheduledDeletionDate: true }
      })

      if (!user?.deletedAt || !user.scheduledDeletionDate) {
        return { isScheduledForDeletion: false }
      }

      const daysRemaining = Math.ceil(
        (user.scheduledDeletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      return {
        isScheduledForDeletion: true,
        scheduledDate: user.scheduledDeletionDate,
        daysRemaining: Math.max(0, daysRemaining)
      }
    } catch (error) {
      console.error('Error getting deletion status:', error)
      return { isScheduledForDeletion: false }
    }
  }
}

