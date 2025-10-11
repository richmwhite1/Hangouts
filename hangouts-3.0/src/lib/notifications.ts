import { db } from './db'

import { logger } from '@/lib/logger'
export async function createNotification(data: {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || null}
    })

    return notification
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error
  }
}

export async function createFriendRequestNotification(senderId: string, receiverId: string, senderName: string) {
  return createNotification({
    userId: receiverId,
    type: 'FRIEND_REQUEST',
    title: 'New Friend Request',
    message: `${senderName} sent you a friend request`,
    data: { senderId }
  })
}

export async function createFriendAcceptedNotification(senderId: string, receiverId: string, receiverName: string) {
  return createNotification({
    userId: senderId,
    type: 'FRIEND_ACCEPTED',
    title: 'Friend Request Accepted',
    message: `${receiverName} accepted your friend request`,
    data: { receiverId }
  })
}



