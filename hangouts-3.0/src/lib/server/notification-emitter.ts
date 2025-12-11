import { EventEmitter } from 'events'

import type { Notification } from '@prisma/client'

export type NotificationRealtimeEvent =
  | { type: 'created'; notification: Notification }
  | { type: 'updated'; notificationId: string; changes: Partial<Notification> }
  | { type: 'deleted'; notificationId: string }
  | { type: 'bulk-read'; notificationIds: string[] }

type NotificationListener = (event: NotificationRealtimeEvent) => void

declare global {
  // eslint-disable-next-line no-var
  var __notificationEmitter: EventEmitter | undefined
}

function getEmitter(): EventEmitter {
  if (!global.__notificationEmitter) {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(0)
    global.__notificationEmitter = emitter
  }

  return global.__notificationEmitter
}

const emitter = getEmitter()

export function emitNotificationEvent(userId: string, event: NotificationRealtimeEvent) {
  emitter.emit(userId, event)
}

export function subscribeToNotificationEvents(userId: string, listener: NotificationListener) {
  emitter.on(userId, listener)

  return () => {
    emitter.off(userId, listener)
  }
}









