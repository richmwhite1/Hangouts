// Context and state management types
import { User, Hangout, FriendRequest, Notification } from './database'
import { ApiError } from './api'

// Auth Context types
export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, username: string, name: string, password: string) => Promise<void>
  signOut: () => void
  clearError: () => void
}

// Hangouts Context types
export interface HangoutsContextType {
  hangouts: Hangout[]
  currentHangout: Hangout | null
  isLoading: boolean
  error: string | null
  fetchHangouts: (params?: Record<string, unknown>) => Promise<void>
  fetchHangout: (id: string) => Promise<void>
  createHangout: (data: Record<string, unknown>) => Promise<void>
  updateHangout: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteHangout: (id: string) => Promise<void>
  rsvpToHangout: (hangoutId: string, status: 'YES' | 'NO' | 'MAYBE') => Promise<void>
  clearError: () => void
}

// Friends Context types
export interface FriendsContextType {
  friends: User[]
  friendRequests: FriendRequest[]
  isLoading: boolean
  error: string | null
  fetchFriends: () => Promise<void>
  fetchFriendRequests: () => Promise<void>
  sendFriendRequest: (userId: string, message?: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  declineFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (userId: string) => Promise<void>
  clearError: () => void
}

// Notifications Context types
export interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearError: () => void
}

// Socket Context types
export interface SocketContextType {
  isConnected: boolean
  socket: unknown | null
  joinHangout: (hangoutId: string) => void
  leaveHangout: (hangoutId: string) => void
  sendMessage: (hangoutId: string, message: string) => void
  onMessage: (callback: (message: Record<string, unknown>) => void) => void
  offMessage: (callback: (message: Record<string, unknown>) => void) => void
  onRSVPUpdate: (callback: (data: Record<string, unknown>) => void) => void
  offRSVPUpdate: (callback: (data: Record<string, unknown>) => void) => void
  onHangoutUpdate: (callback: (hangout: Hangout) => void) => void
  offHangoutUpdate: (callback: (hangout: Hangout) => void) => void
}

// Form types
export interface FormState<T = Record<string, unknown>> {
  data: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  isValid: boolean
}

export interface FormAction<T = Record<string, unknown>> {
  type: 'SET_FIELD' | 'SET_ERRORS' | 'SET_SUBMITTING' | 'RESET' | 'SET_DATA'
  field?: keyof T
  value?: unknown
  errors?: Partial<Record<keyof T, string>>
  data?: T
}

// UI State types
export interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: Notification[]
  isOnline: boolean
}

export interface UIAction {
  type: 'TOGGLE_SIDEBAR' | 'SET_THEME' | 'ADD_NOTIFICATION' | 'REMOVE_NOTIFICATION' | 'SET_ONLINE'
  payload?: unknown
}

// Loading states
export interface LoadingState {
  [key: string]: boolean
}

// Error states
export interface ErrorState {
  [key: string]: string | null
}

// Generic hook return types
export interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: unknown[]) => Promise<void>
  reset: () => void
}

export interface UsePaginationState<T> {
  data: T[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  refresh: () => void
}
