const { db } = require('../../db')

class ReminderProcessor {
  static intervalId = null

  static start(intervalMs = 60000) {
    // Disable reminder processor in production to prevent memory leaks
    if (process.env.NODE_ENV === 'production') {
      console.log('Reminder processor disabled in production to prevent memory issues')
      return
    }

    if (this.intervalId) {
      console.log('Reminder processor already running')
      return
    }

    console.log('Starting reminder processor...')
    this.intervalId = setInterval(async () => {
      try {
        await this.processReminders()
      } catch (error) {
        console.error('Error processing reminders:', error)
      }
    }, intervalMs)

    // Process immediately on start
    this.processReminders()
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Reminder processor stopped')
    }
  }

  static async processReminders() {
    try {
      const now = new Date()
      
      // Find due reminders that haven't been sent or dismissed
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
              startTime: true
            }
          }
        }
      })

      if (dueReminders.length === 0) {
        return
      }

      console.log(`Processing ${dueReminders.length} due reminders`)

      for (const reminder of dueReminders) {
        try {
          // Mark as sent
          await db.reminder.update({
            where: { id: reminder.id },
            data: {
              isSent: true,
              sentAt: now
            }
          })

          // Create notification for the user
          await db.notification.create({
            data: {
              userId: reminder.userId,
              type: 'EVENT_REMINDER',
              title: reminder.title,
              message: reminder.message,
              data: {
                reminderId: reminder.id,
                contentId: reminder.contentId,
                type: reminder.type
              }
            }
          })

          console.log(`Sent reminder to ${reminder.user.name}: ${reminder.title}`)
        } catch (error) {
          console.error(`Failed to process reminder ${reminder.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error in processReminders:', error)
    }
  }

  static async cleanupOldReminders() {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const deleted = await db.reminder.deleteMany({
        where: {
          AND: [
            { isSent: true },
            { sentAt: { lt: thirtyDaysAgo } }
          ]
        }
      })

      if (deleted.count > 0) {
        console.log(`Cleaned up ${deleted.count} old reminders`)
      }
    } catch (error) {
      console.error('Error cleaning up old reminders:', error)
    }
  }
}

module.exports = { ReminderProcessor }
