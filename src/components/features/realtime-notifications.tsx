"use client"

import { memo, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, X, CheckCircle, XCircle, Users, MessageSquare, Calendar } from 'lucide-react'
import { useRealtimeNotifications } from '@/hooks/use-realtime-hangouts'
import { useSocket } from '@/contexts/socket-context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface RealtimeNotificationsProps {
  className?: string
  maxNotifications?: number
}

export const RealtimeNotifications = memo(function RealtimeNotifications({ 
  className,
  maxNotifications = 50
}: RealtimeNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { notifications, isConnected } = useRealtimeNotifications()
  const { socket } = useSocket()

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Get recent notifications
  const recentNotifications = notifications.slice(0, maxNotifications)

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (socket && isConnected) {
      socket.emit('mark-notification-read', { notificationId })
    }
  }, [socket, isConnected])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('mark-all-notifications-read')
    }
  }, [socket, isConnected])

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'HANGOUT_INVITE':
        return <Calendar className="h-4 w-4" />
      case 'HANGOUT_UPDATE':
        return <MessageSquare className="h-4 w-4" />
      case 'FRIEND_REQUEST':
        return <Users className="h-4 w-4" />
      case 'RSVP_UPDATE':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // Get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'HANGOUT_INVITE':
        return 'text-blue-600 dark:text-blue-400'
      case 'HANGOUT_UPDATE':
        return 'text-green-600 dark:text-green-400'
      case 'FRIEND_REQUEST':
        return 'text-purple-600 dark:text-purple-400'
      case 'RSVP_UPDATE':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Connection status */}
          {!isConnected && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">
              <Badge variant="outline" className="mr-2">
                Disconnected
              </Badge>
              Notifications will sync when reconnected
            </div>
          )}

          {/* Notifications List */}
          <ScrollArea className="max-h-96">
            {recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {recentNotifications.map((notification, index) => (
                  <div
                    key={notification.id || index}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      !notification.read 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id as string)
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        "mt-1",
                        getNotificationColor(notification.type as string)
                      )}>
                        {getNotificationIcon(notification.type as string)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt as string), 'MMM d, HH:mm')}
                          </span>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
})
















