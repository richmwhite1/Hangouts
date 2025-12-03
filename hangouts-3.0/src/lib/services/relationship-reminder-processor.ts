import { checkRelationshipReminders } from './relationship-reminder-service'
import { logger } from '@/lib/logger'

export class RelationshipReminderProcessor {
  private static intervalId: NodeJS.Timeout | null = null
  private static isRunning = false
  private static lastRunTime: Date | null = null

  // Start the reminder processor
  // Runs daily by default (86400000 ms = 24 hours)
  static start(intervalMs: number = 86400000) {
    if (this.isRunning) {
      logger.info('Relationship reminder processor is already running')
      return
    }

    logger.info('Starting relationship reminder processor...')
    this.isRunning = true

    // Process immediately on start
    this.processReminders()

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processReminders()
    }, intervalMs)
  }

  // Stop the reminder processor
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    logger.info('Relationship reminder processor stopped')
  }

  // Process relationship reminders
  private static async processReminders() {
    try {
      logger.info('Processing relationship reminders...')
      const result = await checkRelationshipReminders()
      
      if (result.sent > 0) {
        logger.info(`Sent ${result.sent} relationship reminders (checked ${result.checked}, errors: ${result.errors})`)
      } else {
        logger.info(`Checked ${result.checked} friendships, no reminders needed`)
      }

      this.lastRunTime = new Date()
    } catch (error) {
      logger.error('Error processing relationship reminders:', error)
    }
  }

  // Get processor status
  static getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null,
      lastRunTime: this.lastRunTime
    }
  }

  // Manually trigger a check (for testing or admin use)
  static async triggerCheck() {
    if (!this.isRunning) {
      logger.warn('Processor not running, starting it first...')
      this.start()
    }
    await this.processReminders()
  }
}




