import {
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  MessageSquare,
  Star,
  Users
} from "lucide-react"

export const messageNotificationTypes = new Set(['MESSAGE_RECEIVED'])

export const hangoutNotificationTypes = new Set([
  'CONTENT_INVITATION',
  'CONTENT_RSVP',
  'CONTENT_REMINDER',
  'CONTENT_UPDATE',
  'HANGOUT_CONFIRMED',
  'HANGOUT_CANCELLED',
  'HANGOUT_REMINDER',
  'HANGOUT_STARTING_SOON'
])

export const eventNotificationTypes = new Set(['EVENT_REMINDER', 'EVENT_STARTING_SOON'])

export const pollNotificationTypes = new Set(['POLL_VOTE_CAST', 'POLL_CONSENSUS_REACHED'])

export const friendNotificationTypes = new Set(['FRIEND_REQUEST', 'FRIEND_ACCEPTED'])

export const getNotificationIcon = (type: string) => {
  if (messageNotificationTypes.has(type)) return <MessageSquare className="w-4 h-4" />
  if (hangoutNotificationTypes.has(type)) return <Users className="w-4 h-4" />
  if (eventNotificationTypes.has(type)) return <Calendar className="w-4 h-4" />
  if (friendNotificationTypes.has(type)) return <Star className="w-4 h-4" />
  if (pollNotificationTypes.has(type)) return <AlertCircle className="w-4 h-4" />
  if (type === 'PHOTO_SHARED') return <Clock className="w-4 h-4" />
  return <Bell className="w-4 h-4" />
}

export const getNotificationColor = (type: string) => {
  if (type === 'HANGOUT_STARTING_SOON' || type === 'EVENT_STARTING_SOON' || type === 'HANGOUT_CANCELLED') {
    return 'text-red-500'
  }
  if (type === 'CONTENT_RSVP' || type === 'POLL_VOTE_CAST') {
    return 'text-orange-500'
  }
  if (messageNotificationTypes.has(type)) {
    return 'text-blue-500'
  }
  if (type === 'HANGOUT_REMINDER' || type === 'EVENT_REMINDER') {
    return 'text-green-500'
  }
  return 'text-gray-500'
}

export const formatNotificationTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return date.toLocaleDateString()
}






