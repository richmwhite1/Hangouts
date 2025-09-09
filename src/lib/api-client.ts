import { config } from './config'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface CreateHangoutData {
  title: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  startTime: string
  endTime: string
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'
  maxParticipants?: number
  weatherEnabled?: boolean
  participants?: string[]
}

export interface SignInData {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  username: string
  name: string
  password: string
}

export interface User {
  id: string
  email: string
  username: string
  name: string
  avatar?: string
  isActive: boolean
  createdAt: string
}

export interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  startTime: string
  endTime: string
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'
  maxParticipants?: number
  weatherEnabled: boolean
  creatorId: string
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  participants: Array<{
    id: string
    userId: string
    role: 'CREATOR' | 'CO_ORGANIZER' | 'MEMBER'
    rsvpStatus: 'PENDING' | 'YES' | 'NO' | 'MAYBE'
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
  }>
  _count: {
    participants: number
    tasks: number
  }
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    // Always use localhost:3000 for development
    this.baseUrl = 'http://localhost:3000/api'
  }

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // Public method to check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token
  }

  // Authentication methods
  async signIn(data: SignInData): Promise<{ user: User; token: string }> {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async signUp(data: SignUpData): Promise<{ user: User; token: string }> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me')
  }

  // Hangout methods
  async getHangouts(params?: {
    status?: string
    privacy?: string
    limit?: number
    offset?: number
  }): Promise<{ hangouts: Hangout[] }> {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.privacy) query.append('privacy', params.privacy)
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.offset) query.append('offset', params.offset.toString())

    const queryString = query.toString()
    return this.request(`/hangouts${queryString ? `?${queryString}` : ''}`)
  }

  async getHangout(id: string): Promise<{ hangout: Hangout }> {
    return this.request(`/hangouts/${id}`)
  }

  async createHangout(data: CreateHangoutData): Promise<{ hangout: Hangout }> {
    return this.request('/hangouts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateHangout(id: string, data: Partial<CreateHangoutData>): Promise<{ hangout: Hangout }> {
    return this.request(`/hangouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteHangout(id: string): Promise<void> {
    return this.request(`/hangouts/${id}`, {
      method: 'DELETE',
    })
  }

  // RSVP methods
  async updateRSVP(hangoutId: string, status: 'YES' | 'NO' | 'MAYBE'): Promise<{ success: boolean }> {
    return this.request(`/hangouts/${hangoutId}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  // Friends methods
  async getFriends(): Promise<{ friends: User[] }> {
    return this.request('/friends')
  }

  async getFriendRequests(): Promise<{ 
    sent: any[]
    received: any[]
  }> {
    return this.request('/friends/requests')
  }

  async sendFriendRequest(userId: string, message?: string): Promise<{ success: boolean }> {
    return this.request('/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    })
  }

  async respondToFriendRequest(requestId: string, status: 'ACCEPTED' | 'DECLINED'): Promise<{ success: boolean }> {
    return this.request(`/friends/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  // Notifications methods
  async getNotifications(): Promise<{ notifications: any[] }> {
    return this.request('/notifications')
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    return this.request(`/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
    })
  }

  async updateNotificationPreferences(preferences: any): Promise<{ success: boolean }> {
    return this.request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    })
  }
}

export const apiClient = new ApiClient()
