import { db } from '@/lib/db'
import { ReminderType } from '@prisma/client'

import { logger } from '@/lib/logger'
export interface ReminderData {
  contentId?: string
  type: ReminderType
  title: string
  message: string
  scheduledFor: Date
}

export class ReminderService {
  // Create reminders for a hangout or event
  static async createHangoutReminders(
    userId: string,
    contentId: string,
    title: string,
    startTime: Date
  ) {
    const reminders: ReminderData[] = []
    const now = new Date()

    // 1 hour before reminder
    const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000)
    if (oneHourBefore > now) {
      reminders.push({
        contentId,
        type: 'HANGOUT_1_HOUR',
        title: `${title} - Starting Soon!`,
        message: `${title} starts in 1 hour. Get ready!`,
        scheduledFor: oneHourBefore
      })
    }

    // Starting now reminder
    const startingNow = new Date(startTime.getTime() - 5 * 60 * 1000) // 5 minutes before
    if (startingNow > now) {
      reminders.push({
        contentId,
        type: 'HANGOUT_STARTING',
        title: `${title} - Starting Now!`,
        message: `${title} is starting now!`,
        scheduledFor: startingNow
      })
    }

    // Day before reminder
    const dayBefore = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
    if (dayBefore > now) {
      reminders.push({
        contentId,
        type: 'HANGOUT_DAY_BEFORE',
        title: `${title} - Tomorrow!`,
        message: `Don't forget! ${title} is tomorrow.`,
        scheduledFor: dayBefore
      })
    }

    // Create all reminders
    const createdReminders = []
    for (const reminder of reminders) {
      const created = await db.reminder.create({
        data: {
          userId,
          ...reminder
        }
      })
      createdReminders.push(created)
    }

    return createdReminders
  }

  // Create reminders for an event
  static async createEventReminders(
    userId: string,
    contentId: string,
    title: string,
    startTime: Date
  ) {
    const reminders: ReminderData[] = []
    const now = new Date()

    // 1 hour before reminder
    const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000)
    if (oneHourBefore > now) {
      reminders.push({
        contentId,
        type: 'EVENT_1_HOUR',
        title: `${title} - Starting Soon!`,
        message: `${title} starts in 1 hour. Get ready!`,
        scheduledFor: oneHourBefore
      })
    }

    // Starting now reminder
    const startingNow = new Date(startTime.getTime() - 5 * 60 * 1000) // 5 minutes before
    if (startingNow > now) {
      reminders.push({
        contentId,
        type: 'EVENT_STARTING',
        title: `${title} - Starting Now!`,
        message: `${title} is starting now!`,
        scheduledFor: startingNow
      })
    }

    // Day before reminder
    const dayBefore = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
    if (dayBefore > now) {
      reminders.push({
        contentId,
        type: 'EVENT_DAY_BEFORE',
        title: `${title} - Tomorrow!`,
        message: `Don't forget! ${title} is tomorrow.`,
        scheduledFor: dayBefore
      })
    }

    // Create all reminders
    const createdReminders = []
    for (const reminder of reminders) {
      const created = await db.reminder.create({
        data: {
          userId,
          ...reminder
        }
      })
      createdReminders.push(created)
    }

    return createdReminders
  }

  // Process due reminders and create notifications
  static async processDueReminders() {
    const now = new Date()
    const dueReminders = await db.reminder.findMany({
      where: {
        scheduledFor: {
          lte: now
        },
        isSent: false,
        isDismissed: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            startTime: true,
            location: true
          }
        }
      }
    })

    const processedReminders = []

    for (const reminder of dueReminders) {
      try {
        // Create notification
        const notification = await db.notification.create({
          data: {
            userId: reminder.userId,
            type: this.getNotificationType(reminder.type),
            title: reminder.title,
            message: reminder.message,
            data: {
              reminderId: reminder.id,
              contentId: reminder.contentId,
              contentTitle: reminder.content?.title,
              contentType: reminder.content?.type
            }
          }
        })

        // Mark reminder as sent
        await db.reminder.update({
          where: { id: reminder.id },
          data: {
            isSent: true,
            sentAt: now
          }
        })

        processedReminders.push({
          reminder,
          notification
        })

        // // console.log(`Processed reminder: ${reminder.title} for user ${reminder.user.name}`); // Removed for production; // Removed for production
      } catch (error) {
        logger.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    return processedReminders
  }

  // Get notification type from reminder type
  private static getNotificationType(reminderType: ReminderType) {
    switch (reminderType) {
      case 'HANGOUT_1_HOUR':
      case 'HANGOUT_DAY_BEFORE':
        return 'HANGOUT_REMINDER'
      case 'HANGOUT_STARTING':
        return 'HANGOUT_STARTING_SOON'
      case 'EVENT_1_HOUR':
      case 'EVENT_DAY_BEFORE':
        return 'EVENT_REMINDER'
      case 'EVENT_STARTING':
        return 'EVENT_STARTING_SOON'
      default:
        return 'HANGOUT_REMINDER'
    }
  }

  // Clean up old reminders
  static async cleanupOldReminders() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await db.reminder.deleteMany({
      where: {
        scheduledFor: {
          lt: thirtyDaysAgo
        },
        isSent: true
      }
    })

    // // console.log(`Cleaned up ${result.count} old reminders`); // Removed for production; // Removed for production
    return result.count
  }
}
