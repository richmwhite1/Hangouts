"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  BarChart3,
  Loader2
} from "lucide-react"

import { useNotifications } from '@/contexts/notification-context'
import {
  eventNotificationTypes,
  formatNotificationTimestamp,
  getNotificationColor,
  getNotificationIcon,
  hangoutNotificationTypes,
  messageNotificationTypes
} from '@/lib/notification-visuals'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings?: () => void
  onOpenHistory?: () => void
}

export function NotificationCenter({ isOpen, onClose, onOpenSettings, onOpenHistory }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetchingMore,
    hasMore,
    refreshNotifications,
    fetchMoreNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification
  } = useNotifications()
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (isOpen) {
      refreshNotifications()
    }
  }, [isOpen, refreshNotifications])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (activeTab === 'all') return true
      if (activeTab === 'unread') return !notification.isRead
      if (activeTab === 'messages') return messageNotificationTypes.has(notification.type)
      if (activeTab === 'hangouts') return hangoutNotificationTypes.has(notification.type)
      if (activeTab === 'events') return eventNotificationTypes.has(notification.type)
      return true
    })
  }, [notifications, activeTab])

  const handleNotificationClick = (notificationId: string, link?: string) => {
    markAsRead(notificationId)
    if (link && typeof window !== 'undefined') {
      window.location.href = link
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-end p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Settings
              </Button>
            )}
            {onOpenHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenHistory}
                className="text-xs"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                History
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white dark:bg-gray-900">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mx-4 mb-4 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
              <TabsTrigger value="hangouts" className="text-xs">Hangouts</TabsTrigger>
              <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
            </TabsList>
            <div className="max-h-96 overflow-y-auto bg-white dark:bg-gray-900">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  No notifications found
                </div>
              ) : (
                <div className="space-y-1 bg-white dark:bg-gray-900">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification.id, notification.data?.link)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatNotificationTimestamp(notification.createdAt)}
                                </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      markAsRead(notification.id)
                                    }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    dismissNotification(notification.id)
                                  }}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                    {hasMore && (
                      <div className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchMoreNotifications}
                          disabled={isFetchingMore}
                        >
                          {isFetchingMore ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Loading
                            </>
                          ) : (
                            'Load more'
                          )}
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </div>
          </Tabs>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Link href="/notifications" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium" onClick={onClose}>
              View all notifications →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}