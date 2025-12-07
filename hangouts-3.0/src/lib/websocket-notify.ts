import { logger } from '@/lib/logger'

/**
 * Emit a notification to a user via WebSocket
 * This will be received in real-time by connected clients
 */
export function emitNotificationToUser(
  userId: string,
  notification: {
    id: string
    type: string
    title: string
    message: string
    data?: any
    createdAt: string
  }
): void {
  try {
    // Check if Socket.IO server is available (in global scope from server.js)
    if (typeof global !== 'undefined' && (global as any).io) {
      const io = (global as any).io
      
      // Emit to user's notification room
      io.to(`user:${userId}`).emit('notification', notification)
      
      logger.info(`Emitted notification to user ${userId} via WebSocket`)
    } else {
      logger.warn('Socket.IO server not available, skipping WebSocket notification')
    }
  } catch (error) {
    logger.error('Error emitting notification via WebSocket:', error)
  }
}

/**
 * Emit notifications to multiple users
 */
export function emitNotificationToUsers(
  userIds: string[],
  notification: {
    id: string
    type: string
    title: string
    message: string
    data?: any
    createdAt: string
  }
): void {
  userIds.forEach(userId => {
    emitNotificationToUser(userId, notification)
  })
}

/**
 * Emit hangout activity update to all participants
 */
export function emitHangoutActivity(
  hangoutId: string,
  activity: {
    type: 'message' | 'photo' | 'comment' | 'vote' | 'rsvp'
    userId: string
    userName: string
    data?: any
  }
): void {
  try {
    if (typeof global !== 'undefined' && (global as any).io) {
      const io = (global as any).io
      
      // Emit to hangout room
      io.to(`hangout:${hangoutId}`).emit('hangout-activity', {
        hangoutId,
        ...activity,
        timestamp: new Date().toISOString()
      })
      
      logger.info(`Emitted hangout activity for hangout ${hangoutId}`)
    }
  } catch (error) {
    logger.error('Error emitting hangout activity:', error)
  }
}

/**
 * Emit unread count update to a user
 */
export function emitUnreadCountUpdate(
  userId: string,
  counts: {
    notifications: number
    messages?: number
  }
): void {
  try {
    if (typeof global !== 'undefined' && (global as any).io) {
      const io = (global as any).io
      
      io.to(`user:${userId}`).emit('unread-count-update', counts)
      
      logger.info(`Emitted unread count update to user ${userId}`)
    }
  } catch (error) {
    logger.error('Error emitting unread count update:', error)
  }
}

