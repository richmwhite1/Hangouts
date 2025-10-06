// Unified Content Types for Social Media App
// Supports Hangouts, Events, Communities with consistent structure

export type ContentType = 'HANGOUT' | 'EVENT' | 'COMMUNITY'

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED'

export type PrivacyLevel = 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'

export type ParticipantRole = 'CREATOR' | 'ADMIN' | 'MODERATOR' | 'MEMBER'

export type RSVPStatus = 'PENDING' | 'YES' | 'NO' | 'MAYBE'

// Base Content Interface - All content types extend this
export interface BaseContent {
  id: string
  type: ContentType
  title: string
  description?: string
  image?: string
  location?: string
  latitude?: number
  longitude?: number
  startTime?: string
  endTime?: string
  status: ContentStatus
  privacyLevel: PrivacyLevel
  creatorId: string
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
  
  // Social features
  participants: ContentParticipant[]
  likes: ContentLike[]
  comments: ContentComment[]
  shares: ContentShare[]
  hashtags: string[]
  
  // Counts
  _count: {
    participants: number
    likes: number
    comments: number
    shares: number
  }
}

// Content Participants
export interface ContentParticipant {
  id: string
  contentId: string
  userId: string
  role: ParticipantRole
  rsvpStatus: RSVPStatus
  canEdit: boolean
  invitedAt: string
  respondedAt?: string
  joinedAt?: string
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

// Social Interactions
export interface ContentLike {
  id: string
  contentId: string
  userId: string
  createdAt: string
  user: {
    id: string
    name: string
    avatar?: string
  }
}

export interface ContentComment {
  id: string
  contentId: string
  userId: string
  content: string
  replyToId?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  replies?: ContentComment[]
}

export interface ContentShare {
  id: string
  contentId: string
  userId: string
  message?: string
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

// Specific Content Types
export interface HangoutContent extends BaseContent {
  type: 'HANGOUT'
  maxParticipants?: number
  weatherEnabled: boolean
  tasks: HangoutTask[]
  polls: HangoutPoll[]
  itinerary: HangoutItineraryItem[]
}

export interface EventContent extends BaseContent {
  type: 'EVENT'
  venue?: string
  address?: string
  price?: number
  externalUrl?: string
  category: string
  ticketUrl?: string
}

export interface CommunityContent extends BaseContent {
  type: 'COMMUNITY'
  memberCount: number
  rules?: string
  category: string
  website?: string
  isJoined?: boolean
}

// Supporting Types
export interface HangoutTask {
  id: string
  hangoutId: string
  title: string
  description?: string
  assignedToId?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  dueDate?: string
  createdAt: string
  updatedAt: string
  assignedTo?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface HangoutPoll {
  id: string
  hangoutId: string
  creatorId: string
  title: string
  description?: string
  options: string[]
  allowMultiple: boolean
  isAnonymous: boolean
  expiresAt?: string
  createdAt: string
  votes: PollVote[]
}

export interface PollVote {
  id: string
  pollId: string
  userId: string
  option: string
  createdAt: string
  user: {
    id: string
    name: string
    avatar?: string
  }
}

export interface HangoutItineraryItem {
  id: string
  hangoutId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  order: number
  createdAt: string
}

// Search and Filter Types
export interface ContentFilter {
  type?: ContentType[]
  status?: ContentStatus[]
  privacyLevel?: PrivacyLevel[]
  category?: string[]
  hashtags?: string[]
  location?: {
    latitude: number
    longitude: number
    radius: number
  }
  dateRange?: {
    start: string
    end: string
  }
  searchQuery?: string
}

export interface ContentSort {
  field: 'createdAt' | 'startTime' | 'title' | 'participantCount' | 'likeCount'
  direction: 'asc' | 'desc'
}

// API Response Types
export interface ContentListResponse {
  success: boolean
  data: {
    content: BaseContent[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    filters: ContentFilter
  }
}

export interface ContentDetailResponse {
  success: boolean
  data: {
    content: BaseContent
  }
}


















