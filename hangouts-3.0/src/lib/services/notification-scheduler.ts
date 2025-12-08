import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { triggerBatchNotifications } from '@/lib/notification-triggers'
import { checkRelationshipReminders } from './relationship-reminder-service'

/**
 * Notification Scheduler Service
 * Handles scheduled reminders for hangouts and events
 */

/**
 * Send reminders for hangouts starting in 24 hours
 */
export async function sendDailyReminders(): Promise<void> {
  try {
    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twentyFourHoursBefore = new Date(twentyFourHoursFromNow.getTime() - 30 * 60 * 1000) // 30 min window
    const twentyFourHoursAfter = new Date(twentyFourHoursFromNow.getTime() + 30 * 60 * 1000)

    // Find hangouts starting in 24 hours
    const upcomingHangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        status: 'PUBLISHED',
        startTime: {
          gte: twentyFourHoursBefore,
          lte: twentyFourHoursAfter
        }
      },
      include: {
        content_participants: {
          select: {
            userId: true
          }
        }
      }
    })

    logger.info(`Found ${upcomingHangouts.length} hangouts starting in 24 hours`)

    // Send reminders for each hangout
    for (const hangout of upcomingHangouts) {
      const participantIds = hangout.content_participants.map(p => p.userId)

      if (participantIds.length === 0) {
        continue
      }

      await triggerBatchNotifications({
        type: 'HANGOUT_REMINDER',
        recipientIds: participantIds,
        title: 'Hangout Reminder',
        message: `"${hangout.title}" starts in 24 hours`,
        senderId: hangout.creatorId,
        relatedId: hangout.id,
        data: {
          hangoutId: hangout.id,
          hangoutTitle: hangout.title,
          startTime: hangout.startTime
        }
      })

      logger.info(`Sent reminder for hangout: ${hangout.title}`)
    }

    // Send reminders for saved events starting in 24 hours
    const upcomingEvents = await db.content.findMany({
      where: {
        type: 'EVENT',
        status: 'PUBLISHED',
        startTime: {
          gte: twentyFourHoursBefore,
          lte: twentyFourHoursAfter
        }
      },
      include: {
        eventSaves: {
          select: {
            userId: true
          }
        }
      }
    })

    logger.info(`Found ${upcomingEvents.length} events starting in 24 hours`)

    // Send reminders for each event
    for (const event of upcomingEvents) {
      const userIds = event.eventSaves.map(s => s.userId)

      if (userIds.length === 0) {
        continue
      }

      await triggerBatchNotifications({
        type: 'EVENT_REMINDER',
        recipientIds: userIds,
        title: 'Event Reminder',
        message: `"${event.title}" starts in 24 hours`,
        senderId: event.creatorId,
        relatedId: event.id,
        data: {
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.startTime
        }
      })

      logger.info(`Sent reminder for event: ${event.title}`)
    }

    logger.info('Daily reminders completed')
  } catch (error) {
    logger.error('Error sending daily reminders:', error)
    throw error
  }
}

/**
 * Send reminders for hangouts starting in 1 hour
 */
export async function sendHourlyReminders(): Promise<void> {
  try {
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const oneHourBefore = new Date(oneHourFromNow.getTime() - 5 * 60 * 1000) // 5 min window
    const oneHourAfter = new Date(oneHourFromNow.getTime() + 5 * 60 * 1000)

    // Find hangouts starting in 1 hour
    const startingSoonHangouts = await db.content.findMany({
      where: {
        type: 'HANGOUT',
        status: 'PUBLISHED',
        startTime: {
          gte: oneHourBefore,
          lte: oneHourAfter
        }
      },
      include: {
        content_participants: {
          where: {
            rsvp: {
              status: 'YES'
            }
          },
          select: {
            userId: true
          }
        }
      }
    })

    logger.info(`Found ${startingSoonHangouts.length} hangouts starting in 1 hour`)

    // Send reminders for each hangout
    for (const hangout of startingSoonHangouts) {
      const participantIds = hangout.content_participants.map(p => p.userId)

      if (participantIds.length === 0) {
        continue
      }

      await triggerBatchNotifications({
        type: 'HANGOUT_STARTING_SOON',
        recipientIds: participantIds,
        title: 'Hangout Starting Soon',
        message: `"${hangout.title}" starts in 1 hour!`,
        senderId: hangout.creatorId,
        relatedId: hangout.id,
        data: {
          hangoutId: hangout.id,
          hangoutTitle: hangout.title,
          startTime: hangout.startTime
        }
      })

      logger.info(`Sent starting soon reminder for hangout: ${hangout.title}`)
    }

    // Send reminders for saved events starting in 1 hour
    const startingSoonEvents = await db.content.findMany({
      where: {
        type: 'EVENT',
        status: 'PUBLISHED',
        startTime: {
          gte: oneHourBefore,
          lte: oneHourAfter
        }
      },
      include: {
        eventSaves: {
          select: {
            userId: true
          }
        }
      }
    })

    logger.info(`Found ${startingSoonEvents.length} events starting in 1 hour`)

    // Send reminders for each event
    for (const event of startingSoonEvents) {
      const userIds = event.eventSaves.map(s => s.userId)

      if (userIds.length === 0) {
        continue
      }

      await triggerBatchNotifications({
        type: 'EVENT_STARTING_SOON',
        recipientIds: userIds,
        title: 'Event Starting Soon',
        message: `"${event.title}" starts in 1 hour!`,
        senderId: event.creatorId,
        relatedId: event.id,
        data: {
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.startTime
        }
      })

      logger.info(`Sent starting soon reminder for event: ${event.title}`)
    }

    logger.info('Hourly reminders completed')
  } catch (error) {
    logger.error('Error sending hourly reminders:', error)
    throw error
  }
}

/**
 * Send reminders for polls closing in 24 hours
 */
export async function sendPollClosingReminders(): Promise<void> {
  try {
    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twentyFourHoursBefore = new Date(twentyFourHoursFromNow.getTime() - 30 * 60 * 1000)
    const twentyFourHoursAfter = new Date(twentyFourHoursFromNow.getTime() + 30 * 60 * 1000)

    // Find polls closing in 24 hours
    const closingPolls = await db.polls.findMany({
      where: {
        closingAt: {
          gte: twentyFourHoursBefore,
          lte: twentyFourHoursAfter
        },
        status: 'OPEN'
      },
      include: {
        content: {
          include: {
            content_participants: {
              select: {
                userId: true
              }
            }
          }
        },
        PollVote: {
          select: {
            userId: true
          }
        }
      }
    })

    logger.info(`Found ${closingPolls.length} polls closing in 24 hours`)

    // Send reminders for each poll
    for (const poll of closingPolls) {
      // Get users who haven't voted yet
      const allParticipants = poll.content.content_participants.map(p => p.userId)
      const voterIds = poll.PollVote.map(v => v.userId)
      const nonVoterIds = allParticipants.filter(id => !voterIds.includes(id))

      if (nonVoterIds.length === 0) {
        continue
      }

      await triggerBatchNotifications({
        type: 'HANGOUT_POLL_CLOSING_SOON',
        recipientIds: nonVoterIds,
        title: 'Poll Closing Soon',
        message: `The poll for "${poll.content.title}" closes in 24 hours`,
        senderId: poll.content.creatorId,
        relatedId: poll.content.id,
        data: {
          hangoutId: poll.content.id,
          hangoutTitle: poll.content.title,
          pollId: poll.id,
          closingAt: poll.closingAt
        }
      })

      logger.info(`Sent poll closing reminder for: ${poll.content.title}`)
    }

    logger.info('Poll closing reminders completed')
  } catch (error) {
    logger.error('Error sending poll closing reminders:', error)
    throw error
  }
}

/**
 * Check and send relationship reminders based on hangout goals
 */
export async function sendRelationshipReminders(): Promise<void> {
  try {
    logger.info('Checking relationship reminders...')
    
    const result = await checkRelationshipReminders()
    
    logger.info(`Relationship reminders: checked ${result.checked}, sent ${result.sent}, errors ${result.errors}`)
  } catch (error) {
    logger.error('Error sending relationship reminders:', error)
    throw error
  }
}

/**
 * Initialize the notification scheduler with cron jobs
 * This should be called when the server starts
 */
export function initializeNotificationScheduler(): void {
  try {
    logger.info('Initializing notification scheduler...')

    // Run hourly reminders every hour
    setInterval(sendHourlyReminders, 60 * 60 * 1000) // Every hour

    // Run daily reminders every 6 hours (to catch all timezones)
    setInterval(sendDailyReminders, 6 * 60 * 60 * 1000) // Every 6 hours

    // Run poll closing reminders every 6 hours
    setInterval(sendPollClosingReminders, 6 * 60 * 60 * 1000) // Every 6 hours

    // Run relationship reminders daily at 10am local time
    setInterval(sendRelationshipReminders, 24 * 60 * 60 * 1000) // Every 24 hours

    // Run initial check after 1 minute
    setTimeout(sendHourlyReminders, 60 * 1000)
    setTimeout(sendDailyReminders, 90 * 1000)
    setTimeout(sendPollClosingReminders, 120 * 1000)
    setTimeout(sendRelationshipReminders, 150 * 1000) // After 2.5 minutes

    logger.info('Notification scheduler initialized successfully')
  } catch (error) {
    logger.error('Error initializing notification scheduler:', error)
  }
}

