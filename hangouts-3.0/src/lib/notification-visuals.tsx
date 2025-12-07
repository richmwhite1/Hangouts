import {
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  MessageSquare,
  Star,
  Users,
  Image as ImageIcon,
  MessageCircle,
  Vote,
  UserCheck,
  BellRing,
  AlertTriangle
} from "lucide-react"

export const messageNotificationTypes = new Set([
  'MESSAGE_RECEIVED',
  'HANGOUT_NEW_MESSAGE'
])

export const hangoutNotificationTypes = new Set([
  'CONTENT_INVITATION',
  'CONTENT_RSVP',
  'CONTENT_REMINDER',
  'CONTENT_UPDATE',
  'HANGOUT_CONFIRMED',
  'HANGOUT_CANCELLED',
  'HANGOUT_REMINDER',
  'HANGOUT_STARTING_SOON',
  'HANGOUT_VOTE_NEEDED',
  'HANGOUT_RSVP_NEEDED',
  'HANGOUT_MANDATORY_RSVP'
])

export const eventNotificationTypes = new Set(['EVENT_REMINDER', 'EVENT_STARTING_SOON'])

export const pollNotificationTypes = new Set(['POLL_VOTE_CAST', 'POLL_CONSENSUS_REACHED'])

export const friendNotificationTypes = new Set(['FRIEND_REQUEST', 'FRIEND_ACCEPTED'])

export const getNotificationIcon = (type: string) => {
  // Message notifications
  if (type === 'HANGOUT_NEW_MESSAGE' || type === 'MESSAGE_RECEIVED') {
    return <MessageSquare className="w-4 h-4" />
  }
  
  // Photo notifications
  if (type === 'HANGOUT_NEW_PHOTO' || type === 'PHOTO_SHARED') {
    return <ImageIcon className="w-4 h-4" />
  }
  
  // Comment notifications
  if (type === 'HANGOUT_NEW_COMMENT' || type === 'COMMENT') {
    return <MessageCircle className="w-4 h-4" />
  }
  
  // Vote notifications
  if (type === 'HANGOUT_VOTE_NEEDED' || type === 'HANGOUT_POLL_CLOSING_SOON' || pollNotificationTypes.has(type)) {
    return <Vote className="w-4 h-4" />
  }
  
  // RSVP notifications
  if (type === 'HANGOUT_RSVP_NEEDED' || type === 'HANGOUT_MANDATORY_RSVP' || type === 'CONTENT_RSVP') {
    return <UserCheck className="w-4 h-4" />
  }
  
  // Urgent notifications
  if (type === 'HANGOUT_STARTING_SOON' || type === 'EVENT_STARTING_SOON') {
    return <BellRing className="w-4 h-4" />
  }
  
  // Warning notifications
  if (type === 'HANGOUT_CANCELLED') {
    return <AlertTriangle className="w-4 h-4" />
  }
  
  // Reminder notifications
  if (type === 'HANGOUT_REMINDER' || type === 'EVENT_REMINDER' || type === 'CONTENT_REMINDER') {
    return <Clock className="w-4 h-4" />
  }
  
  // Event notifications
  if (eventNotificationTypes.has(type)) {
    return <Calendar className="w-4 h-4" />
  }
  
  // Hangout notifications
  if (hangoutNotificationTypes.has(type)) {
    return <Users className="w-4 h-4" />
  }
  
  // Friend notifications
  if (friendNotificationTypes.has(type)) {
    return <Star className="w-4 h-4" />
  }
  
  return <Bell className="w-4 h-4" />
}

export const getNotificationColor = (type: string) => {
  // Urgent/Critical - Red
  if (type === 'HANGOUT_STARTING_SOON' || type === 'EVENT_STARTING_SOON' || 
      type === 'HANGOUT_CANCELLED' || type === 'HANGOUT_MANDATORY_RSVP') {
    return 'text-red-500'
  }
  
  // Important - Orange
  if (type === 'HANGOUT_VOTE_NEEDED' || type === 'HANGOUT_RSVP_NEEDED' || 
      type === 'HANGOUT_POLL_CLOSING_SOON' || type === 'POLL_VOTE_CAST') {
    return 'text-orange-500'
  }
  
  // Messages - Blue
  if (type === 'HANGOUT_NEW_MESSAGE' || type === 'MESSAGE_RECEIVED') {
    return 'text-blue-500'
  }
  
  // Photos - Purple
  if (type === 'HANGOUT_NEW_PHOTO' || type === 'PHOTO_SHARED') {
    return 'text-purple-500'
  }
  
  // Comments - Cyan
  if (type === 'HANGOUT_NEW_COMMENT' || type === 'COMMENT') {
    return 'text-cyan-500'
  }
  
  // Reminders - Green
  if (type === 'HANGOUT_REMINDER' || type === 'EVENT_REMINDER' || type === 'CONTENT_REMINDER') {
    return 'text-green-500'
  }
  
  // RSVP - Violet
  if (type === 'CONTENT_RSVP') {
    return 'text-violet-500'
  }
  
  // Friends - Yellow
  if (friendNotificationTypes.has(type)) {
    return 'text-yellow-500'
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






