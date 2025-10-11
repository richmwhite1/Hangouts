"use client"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  X,
  Calendar,
  MessageSquare,
  Users,
  AlertCircle,
  Clock,
  Star,
  TrendingUp,
  BarChart3
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { logger } from '@/lib/logger'
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
interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  byDay: Record<string, number>
  readRate: number
}
interface NotificationHistoryProps {
  isOpen: boolean
  onClose: () => void
}
export function NotificationHistory({ isOpen, onClose }: NotificationHistoryProps) {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [timeRange, setTimeRange] = useState('7d')
  useEffect(() => {
    if (isOpen ) {
      fetchNotifications()
      fetchStats()
    }
  }, [isOpen, token, timeRange])
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (timeRange === '7d') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        params.append('since', sevenDaysAgo.toISOString())
      } else if (timeRange === '30d') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        params.append('since', thirtyDaysAgo.toISOString())
      }
      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data.notifications)
        }
      }
    } catch (error) {
      logger.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false)
    }
  }
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      }
    } catch (error) {
      logger.error('Error fetching stats:', error);
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <CardTitle>Notification History & Analytics</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
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
            {/* Stats Overview */}
            {stats && (
              <div className="px-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Bell className="w-4 h-4 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Total</p>
                        <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">Unread</p>
                        <p className="text-lg font-bold text-orange-600">{stats.unread}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Read Rate</p>
                        <p className="text-lg font-bold text-green-600">{stats.readRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-purple-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">This Week</p>
                        <p className="text-lg font-bold text-purple-600">
                          {stats.byDay[new Date().toISOString().split('T')[0]] || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading notification history...
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
                              <div className="flex items-center space-x-2 mt-1">
                                <p className="text-xs text-gray-400">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                                {notification.isRead && (
                                  <Badge variant="secondary" className="text-xs">
                                    Read
                                  </Badge>
                                )}
                                {notification.isDismissed && (
                                  <Badge variant="outline" className="text-xs">
                                    Dismissed
                                  </Badge>
                                )}
                              </div>
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