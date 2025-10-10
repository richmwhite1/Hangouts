import { ReminderService } from './reminder-service'

export class ReminderProcessor {
  private static intervalId: NodeJS.Timeout | null = null
  private static isRunning = false

  // Start the reminder processor
  static start(intervalMs: number = 60000) { // Default: check every minute
    if (this.isRunning) {
      console.log('Reminder processor is already running')
      return
    }

    console.log('Starting reminder processor...')
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
    console.log('Reminder processor stopped')
  }

  // Process due reminders
  private static async processReminders() {
    try {
      console.log('Processing due reminders...')
      const processed = await ReminderService.processDueReminders()
      
      if (processed.length > 0) {
        console.log(`Processed ${processed.length} reminders`)
      }

      // Clean up old reminders every hour
      const now = new Date()
      if (now.getMinutes() === 0) {
        await ReminderService.cleanupOldReminders()
      }
    } catch (error) {
      console.error('Error processing reminders:', error)
    }
  }

  // Get processor status
  static getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null
    }
  }
}
