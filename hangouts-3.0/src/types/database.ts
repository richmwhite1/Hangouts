// Generated types from Prisma schema
// This file should be regenerated when the schema changes

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN'
export type ContentType = 'HANGOUT' | 'EVENT' | 'COMMUNITY'
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED'
export type PrivacyLevel = 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'
export type ConversationType = 'DIRECT' | 'GROUP' | 'COMMUNITY'
export type ParticipantRole = 'CREATOR' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
export type RSVPStatus = 'PENDING' | 'YES' | 'NO' | 'MAYBE'
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'LOCATION' | 'POLL' | 'SYSTEM'
export type NotificationType = 
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'MESSAGE_RECEIVED'
  | 'CONTENT_INVITATION'
  | 'CONTENT_RSVP'
  | 'CONTENT_REMINDER'
  | 'CONTENT_UPDATE'
  | 'COMMUNITY_INVITATION'
  | 'MENTION'
  | 'LIKE'
  | 'COMMENT'
  | 'SHARE'
  | 'POLL_VOTE_CAST'
  | 'POLL_CONSENSUS_REACHED'
  | 'HANGOUT_CONFIRMED'
  | 'HANGOUT_CANCELLED'
  | 'HANGOUT_REMINDER'
  | 'HANGOUT_STARTING_SOON'
  | 'EVENT_REMINDER'
  | 'EVENT_STARTING_SOON'
  | 'PHOTO_SHARED'
  | 'RELATIONSHIP_REMINDER'
export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'

// Base User type (without password)
export interface User {
  id: string
  email: string
  username: string
  name: string
  avatar?: string | null
  backgroundImage?: string | null
  bio?: string | null
  location?: string | null
  zodiac?: string | null
  enneagram?: string | null
  bigFive?: string | null
  loveLanguage?: string | null
  isActive: boolean
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

// User with password (for internal use only)
export interface UserWithPassword extends User {
  password: string
}

// Friend Request
export interface FriendRequest {
  id: string
  senderId: string
  receiverId: string
  status: FriendRequestStatus
  message?: string | null
  createdAt: Date
  updatedAt: Date
  sender?: User
  receiver?: User
}

// Friendship
export interface Friendship {
  id: string
  user1Id: string
  user2Id: string
  createdAt: Date
  user1?: User
  user2?: User
}

// Hangout
export interface Hangout {
  id: string
  title: string
  description?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  startTime: Date
  endTime: Date
  status: HangoutStatus
  privacyLevel: PrivacyLevel
  maxParticipants?: number | null
  weatherEnabled: boolean
  creatorId: string
  createdAt: Date
  updatedAt: Date
  creator?: User
  participants?: HangoutParticipant[]
  tasks?: HangoutTask[]
  itinerary?: HangoutItinerary[]
  polls?: HangoutPoll[]
  messages?: HangoutMessage[]
  memories?: HangoutMemory[]
}

// Hangout Participant
export interface HangoutParticipant {
  id: string
  hangoutId: string
  userId: string
  role: ParticipantRole
  rsvpStatus: RSVPStatus
  canEdit: boolean
  invitedAt: Date
  respondedAt?: Date | null
  joinedAt?: Date | null
  hangout?: Hangout
  user?: User
}

// Hangout Task
export interface HangoutTask {
  id: string
  hangoutId: string
  title: string
  description?: string | null
  assignedToId?: string | null
  status: TaskStatus
  dueDate?: Date | null
  createdAt: Date
  updatedAt: Date
  hangout?: Hangout
  assignedTo?: User | null
}

// Hangout Itinerary
export interface HangoutItinerary {
  id: string
  hangoutId: string
  title: string
  description?: string | null
  startTime: Date
  endTime: Date
  location?: string | null
  order: number
  createdAt: Date
  updatedAt: Date
  hangout?: Hangout
}

// Notification
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown> | null
  isRead: boolean
  isDismissed: boolean
  isEmailSent: boolean
  isPushSent: boolean
  createdAt: Date
  readAt?: Date | null
  dismissedAt?: Date | null
  user?: User
}

// Notification Preference
export interface NotificationPreference {
  id: string
  userId: string
  type: NotificationType
  emailEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
  createdAt: Date
  updatedAt: Date
  user?: User
}

// Hangout Message
export interface HangoutMessage {
  id: string
  hangoutId: string
  userId: string
  message: string
  messageType: MessageType
  fileUrl?: string | null
  replyToId?: string | null
  createdAt: Date
  updatedAt: Date
  hangout?: Hangout
  user?: User
  replyTo?: HangoutMessage | null
  replies?: HangoutMessage[]
}

// Hangout Memory
export interface HangoutMemory {
  id: string
  hangoutId: string
  userId: string
  content: string
  photos: string[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  hangout?: Hangout
  user?: User
}

// Hangout Poll
export interface HangoutPoll {
  id: string
  hangoutId: string
  creatorId: string
  title: string
  description?: string | null
  type: PollType
  status: PollStatus
  options: string[]
  expiresAt?: Date | null
  allowMultiple: boolean
  isAnonymous: boolean
  createdAt: Date
  updatedAt: Date
  hangout?: Hangout
  creator?: User
  votes?: PollVote[]
}

// Poll Vote
export interface PollVote {
  id: string
  pollId: string
  userId: string
  option: string
  ranking?: number | null
  createdAt: Date
  poll?: HangoutPoll
  user?: User
}
