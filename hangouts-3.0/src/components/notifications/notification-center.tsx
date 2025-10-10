"use client"
import { useState, useEffect } from 'react'
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
  MessageSquare,
  Calendar,
  Users,
  AlertCircle,
  Clock,
  Star,
  Settings,
  BarChart3
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  isRead: boolean
  isDismissed: boolean
  createdAt: string
  readAt?: string
  dismissedAt?: string
}
interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings?: () => void
  onOpenHistory?: () => void
}
export function NotificationCenter({ isOpen, onClose, onOpenSettings, onOpenHistory }: NotificationCenterProps) {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)
  useEffect(() => {
    if (isOpen ) {
      fetchNotifications()
    }
  }, [isOpen])
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data.notifications)
          setUnreadCount(data.data.notifications.filter((n: Notification) => !n.isRead).length)
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true })
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }
  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDismissed: true })
      })
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId)
          return notification && !notification.isRead ? Math.max(0, prev - 1) : prev
        })
      }
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4" />
      case 'HANGOUT_VOTE_NEEDED':
      case 'HANGOUT_RSVP_NEEDED':
      case 'HANGOUT_MANDATORY_RSVP':
        return <Users className="w-4 h-4" />
      case 'HANGOUT_REMINDER':
      case 'EVENT_REMINDER':
        return <Clock className="w-4 h-4" />
      case 'HANGOUT_STARTING_SOON':
      case 'EVENT_STARTING_SOON':
        return <AlertCircle className="w-4 h-4" />
      case 'FRIEND_REQUEST':
      case 'FRIEND_ACCEPTED':
        return <Star className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'HANGOUT_MANDATORY_RSVP':
      case 'HANGOUT_STARTING_SOON':
      case 'EVENT_STARTING_SOON':
        return 'text-red-500'
      case 'HANGOUT_VOTE_NEEDED':
      case 'HANGOUT_RSVP_NEEDED':
        return 'text-orange-500'
      case 'MESSAGE':
        return 'text-blue-500'
      case 'HANGOUT_REMINDER':
      case 'EVENT_REMINDER':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !notification.isRead
    if (activeTab === 'messages') return notification.type === 'MESSAGE'
    if (activeTab === 'hangouts') return notification.type.includes('HANGOUT')
    if (activeTab === 'events') return notification.type.includes('EVENT')
    return true
  })
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mx-4 mb-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
              <TabsTrigger value="hangouts" className="text-xs">Hangouts</TabsTrigger>
              <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
            </TabsList>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No notifications found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
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
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => dismissNotification(notification.id)}
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
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}