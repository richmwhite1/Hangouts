'use client'

import Link from 'next/link'
import { Check, CheckCheck, Loader2, Trash2 } from 'lucide-react'

import { PushNotificationSettings } from '@/components/notifications/push-notification-settings'
import { useNotifications } from '@/contexts/notification-context'
import {
  formatNotificationTimestamp,
  getNotificationColor,
  getNotificationIcon
} from '@/lib/notification-visuals'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    isFetchingMore,
    fetchMoreNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification
  } = useNotifications()

  return (
    <div className="space-y-8">
      <PushNotificationSettings />

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-4 border-b p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Notification Center</p>
            <h1 className="text-2xl font-semibold">
              Stay on top of hangouts, friends, and reminders
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
            <Link
              href="/settings/notifications"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Manage preferences
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No notifications yet. Activity about your hangouts, polls, and friends will show up here.
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 px-6 py-4 ${!notification.isRead ? 'bg-muted/40' : ''}`}
              >
                <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-medium">{notification.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationTimestamp(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  {notification.data?.link && (
                    <Link
                      href={notification.data.link}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View details
                    </Link>
                  )}
                </div>
                <div className="flex gap-2">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="rounded-md border p-2 text-muted-foreground hover:bg-muted"
                      aria-label="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="rounded-md border p-2 text-muted-foreground hover:bg-muted"
                    aria-label="Dismiss notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={fetchMoreNotifications}
                  disabled={isFetchingMore}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {isFetchingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
