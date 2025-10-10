// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// User Types
export interface User {
  id: string
  clerkId?: string
  email: string
  username: string
  name: string
  avatar?: string
  backgroundImage?: string
  bio?: string
  location?: string
  zodiac?: string
  enneagram?: string
  bigFive?: string
  loveLanguage?: string
  website?: string
  birthDate?: string
  favoriteActivities?: string
  favoritePlaces?: string
  role: string
  isActive: boolean
  isVerified: boolean
  lastSeen: string
  createdAt: string
  updatedAt: string
}

// Content Types
export interface Content {
  id: string
  type: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime: string
  endTime: string
  privacyLevel: string
  creatorId: string
  createdAt: string
  updatedAt: string
}

// Hangout Types
export interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator: {
    name: string
    username: string
    avatar?: string
  }
  participants?: Array<{
    id: string
    user: {
      name: string
      username: string
      avatar?: string
    }
  }>
  _count?: {
    participants: number
    comments: number
    likes: number
    shares: number
    messages: number
    photos: number
    rsvps: number
    eventSaves: number
  }
}
