// API Request/Response types
import { User, Hangout, FriendRequest, Notification, HangoutParticipant, HangoutPoll, PollVote } from './database'

// Authentication types
export interface SignUpRequest {
  email: string
  username: string
  name: string
  password: string
  confirmPassword: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

// User types
export interface UserProfile extends User {
  friendsCount: number
  hangoutsCount: number
  upcomingHangouts: Hangout[]
}

// Hangout types
export interface CreateHangoutRequest {
  title: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  startTime: string // ISO string
  endTime: string // ISO string
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'
  maxParticipants?: number
  weatherEnabled?: boolean
  image?: string
  participants?: string[]
  // Poll-specific fields
  isPoll?: boolean
  pollOptions?: Array<{
    title: string
    description?: string
    date?: string
    time?: string
    location?: string
  }>
  pollSettings?: {
    allowMultipleVotes: boolean
    allowSuggestions: boolean
    consensusType: 'percentage' | 'minimum'
    consensusPercentage: number
    minimumParticipants: number
  }
}

export interface UpdateHangoutRequest extends Partial<CreateHangoutRequest> {
  id: string
}

export interface HangoutWithParticipants extends Hangout {
  participants: (HangoutParticipant & { user: User })[]
  currentUserParticipant?: HangoutParticipant
}

export interface HangoutListResponse {
  hangouts: HangoutWithParticipants[]
  total: number
  page: number
  limit: number
}

// Friend types
export interface FriendRequestResponse {
  id: string
  sender: User
  receiver: User
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  message?: string
  createdAt: string
}

export interface SendFriendRequestRequest {
  receiverId: string
  message?: string
}

export interface UpdateFriendRequestRequest {
  id: string
  status: 'ACCEPTED' | 'DECLINED'
}

export interface FriendsListResponse {
  friends: User[]
  total: number
}

// RSVP types
export interface RSVPRequest {
  hangoutId: string
  status: 'YES' | 'NO' | 'MAYBE'
}

export interface RSVPResponse {
  participant: HangoutParticipant & { user: User }
  hangout: Hangout
}

// Poll types
export interface CreatePollRequest {
  hangoutId: string
  title: string
  description?: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RANKING' | 'CONSENSUS'
  options: string[]
  expiresAt?: string // ISO string
  allowMultiple?: boolean
  isAnonymous?: boolean
}

export interface VoteRequest {
  pollId: string
  option: string
  ranking?: number
}

export interface PollWithVotes extends HangoutPoll {
  votes: (PollVote & { user: User })[]
  userVote?: PollVote
}

// Notification types
export interface NotificationResponse {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationResponse[]
  total: number
  unreadCount: number
}

export interface UpdateNotificationRequest {
  id: string
  isRead: boolean
}

// Search types
export interface SearchHangoutsRequest {
  query?: string
  category?: string
  location?: string
  dateFrom?: string
  dateTo?: string
  privacyLevel?: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  page?: number
  limit?: number
}

// Error types
export interface ApiError {
  error: string
  message?: string
  code?: string
  details?: Record<string, unknown>
}

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
