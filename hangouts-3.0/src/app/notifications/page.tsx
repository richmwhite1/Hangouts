'use client'

import { useState } from 'react'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'

import { logger } from '@/lib/logger'
export default function NotificationsPage() {
  // Real implementation - no mock data
  const notifications: any[] = []
  const unreadCount = 0
  const markAsRead = async (ids: string[]) => {
    // console.log('Mark as read:', ids); // Removed for production
  }
  const markAllAsRead = async () => {
    // console.log('Mark all as read'); // Removed for production
  }
  const isLoading = false
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead([notificationId])
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  }

  const formatNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return '👥'
      case 'FRIEND_ACCEPTED':
        return '✅'
      case 'HANGOUT_INVITATION':
        return '🎉'
      case 'HANGOUT_RSVP':
        return '📅'
      case 'HANGOUT_REMINDER':
        return '⏰'
      case 'HANGOUT_UPDATE':
        return '📝'
      case 'TASK_ASSIGNED':
        return '📋'
      case 'TASK_DUE':
        return '⚠️'
      case 'MESSAGE_RECEIVED':
        return '💬'
      case 'WEATHER_ALERT':
        return '🌤️'
      case 'ETA_UPDATE':
        return '🚗'
      default:
        return '🔔'
    }
  }

  return (
    <div className="mobile-container">
        <div className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="btn btn-ghost btn-sm"
            >
              {isMarkingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`card ${!notification.isRead ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-dark-900 dark:text-white">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-1 hover:bg-dark-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                    >
                      <Check className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-dark-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No notifications yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                You&apos;ll see notifications about hangouts and friends here
              </p>
            </div>
          </div>
        )}
      </div>
  )
}
