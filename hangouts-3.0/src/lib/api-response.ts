/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

export function createErrorResponse(
  error: string,
  details?: string,
  statusCode?: number
): ApiResponse {
  return {
    success: false,
    error,
    details
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

// Specific response types for common entities
export interface HangoutResponse {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creatorId: string
  creator: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  participants: Array<{
    id: string
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
    rsvpStatus: 'PENDING' | 'YES' | 'NO' | 'MAYBE'
    role: string
    canEdit: boolean
  }>
  photos: Array<{
    id: string
    caption: string
    originalUrl: string
    thumbnailUrl: string
    createdAt: string
    creator: {
      id: string
      name: string
      username: string
      avatar?: string
    }
  }>
  _count: {
    content_participants: number
    comments: number
    content_likes: number
    content_shares: number
    messages: number
  }
}

export interface PollResponse {
  id: string
  hangoutId: string
  creatorId: string
  title: string
  description?: string
  options: Array<{
    title: string
    description?: string
  }>
  allowMultiple: boolean
  isAnonymous: boolean
  expiresAt?: string
  consensusPercentage: number
  minimumParticipants: number
  consensusType: string
  status: 'ACTIVE' | 'TRANSITIONED' | 'CONSENSUS_REACHED'
  allowDelegation: boolean
  allowAbstention: boolean
  allowAddOptions: boolean
  isPublic: boolean
  visibility: 'PRIVATE' | 'FRIENDS' | 'PUBLIC'
  createdAt: string
  updatedAt: string
  votes: Array<{
    id: string
    pollId: string
    userId: string
    option: string
    createdAt: string
  }>
  _count: {
    votes: number
  }
}

export interface RSVPResponse {
  id: string
  hangoutId: string
  userId: string
  status: 'PENDING' | 'YES' | 'NO' | 'MAYBE'
  respondedAt?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    name: string
    avatar?: string
  }
}