import { config } from './config'
import { 
  User, 
  Hangout, 
  FriendRequest, 
  Notification,
  CreateHangoutRequest,
  CreateHangoutData,
  SignInRequest,
  SignUpRequest,
  AuthResponse,
  ApiResponse,
  ApiError,
  HangoutListResponse,
  FriendsListResponse,
  NotificationListResponse,
  RSVPRequest,
  RSVPResponse,
  SendFriendRequestRequest,
  UpdateFriendRequestRequest,
  PaginatedResponse
} from '@/types/api'

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = config.api.baseUrl
  }

  setToken(token: string | null): void {
    this.token = token
  }

  private async request<T = unknown>(
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

    try {
      console.log('API Client request - URL:', url)
      console.log('API Client request - options:', options)
      console.log('API Client request - headers:', headers)
      
      const response = await fetch(url, {
        ...options,
        headers,
      })

      console.log('API Client request - response status:', response.status)
      console.log('API Client request - response ok:', response.ok)

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
          code: response.status.toString()
        }))
        console.log('API Client request - error data:', errorData)
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const jsonResponse = await response.json()
      console.log('API Client request - success response:', jsonResponse)
      return jsonResponse
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  // Authentication methods
  isAuthenticated(): boolean {
    return !!this.token
  }

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const response = await this.request<{ success: boolean; data: AuthResponse }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const response = await this.request<{ success: boolean; data: AuthResponse }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await this.request<{ success: boolean; data: { user: User } }>('/api/auth/me')
    return { user: response.data.user }
  }

  async getUserByUsername(username: string): Promise<{ user: User }> {
    const response = await this.request<{ success: boolean; data: { user: User } }>(`/users/username/${username}`)
    return { user: response.data.user }
  }

  // Hangout methods
  async getHangouts(params?: {
    status?: string
    privacy?: string
    limit?: number
    offset?: number
  }): Promise<HangoutListResponse> {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.privacy) query.append('privacy', params.privacy)
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.offset) query.append('offset', params.offset.toString())

    const queryString = query.toString()
    const response = await this.request<{ success: boolean; data: { hangouts: Hangout[] } }>(`/api/hangouts${queryString ? `?${queryString}` : ''}`)
    return { hangouts: response.data.hangouts }
  }

  async getHangout(id: string): Promise<{ hangout: Hangout }> {
    return this.request<{ hangout: Hangout }>(`/api/hangouts/${id}`)
  }

  async createHangout(data: CreateHangoutRequest): Promise<{ success: boolean; data: Hangout; message: string }> {
    return this.request<{ success: boolean; data: Hangout; message: string }>('/api/hangouts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createPoll(hangoutId: string, data: {
    title: string
    description?: string
    options: Array<{ title: string; description?: string }>
    allowMultiple?: boolean
    isAnonymous?: boolean
    visibility?: 'PRIVATE' | 'FRIENDS' | 'PUBLIC'
  }): Promise<{ success: boolean; poll: any }> {
    return this.request<{ success: boolean; poll: any }>(`/hangouts/${hangoutId}/polls`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateHangout(id: string, data: Partial<CreateHangoutRequest>): Promise<{ hangout: Hangout }> {
    return this.request<{ hangout: Hangout }>(`/hangouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteHangout(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/hangouts/${id}`, {
      method: 'DELETE',
    })
  }

  // RSVP methods
  async updateRSVP(data: RSVPRequest): Promise<RSVPResponse> {
    return this.request<RSVPResponse>(`/hangouts/${data.hangoutId}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify({ status: data.status }),
    })
  }

  // Friends methods
  async getFriends(): Promise<FriendsListResponse> {
    const response = await this.request<{ success: boolean; data: { friends: User[] } }>('/api/friends')
    return { friends: response.data.friends }
  }

  async getFriendRequests(): Promise<{ 
    sent: FriendRequest[]
    received: FriendRequest[]
  }> {
    const response = await this.request<{ 
      sent: FriendRequest[]
      received: FriendRequest[]
    }>('/api/friends/requests')
    return response
  }

  async sendFriendRequest(receiverId: string, message?: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ receiverId, message }),
    })
  }

  async respondToFriendRequest(requestId: string, status: 'ACCEPTED' | 'DECLINED'): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/friends/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async removeFriend(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/friends/${userId}`, {
      method: 'DELETE',
    })
  }

  async searchUsers(query: string, limit = 20, offset = 0): Promise<{ 
    users: User[] 
    total: number 
    hasMore: boolean 
  }> {
    const response = await this.request<{ 
      success: boolean
      data: { 
        users: User[] 
        total: number 
        hasMore: boolean 
      } 
    }>(`/friends/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`)
    return response.data
  }

  async getFriendSuggestions(limit = 10): Promise<{ 
    suggestions: User[] 
  }> {
    const response = await this.request<{ 
      success: boolean
      data: { 
        suggestions: User[] 
      } 
    }>(`/friends/suggestions?limit=${limit}`)
    return response.data
  }

  // Notifications methods
  async getNotifications(): Promise<NotificationListResponse> {
    return this.request<NotificationListResponse>('/notifications')
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ isRead: true }),
    })
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/notifications/mark-all-read', {
      method: 'PUT',
    })
  }

  async updateNotificationPreferences(preferences: Record<string, boolean>): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    })
  }

  // Search methods
  async searchHangouts(query: string, filters?: Record<string, unknown>): Promise<HangoutListResponse> {
    const params = new URLSearchParams({ q: query, ...filters })
    return this.request<HangoutListResponse>(`/hangouts/search?${params}`)
  }

  // Poll methods
  async createPoll(data: {
    hangoutId: string
    title: string
    description?: string
    options: Array<{ title: string; description?: string }>
    allowMultiple?: boolean
    isAnonymous?: boolean
    visibility?: 'PRIVATE' | 'FRIENDS' | 'PUBLIC'
  }): Promise<{ success: boolean; poll: any }> {
    const response = await this.request<{ success: boolean; poll: any }>(`/hangouts/${data.hangoutId}/polls`, {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        options: data.options,
        allowMultiple: data.allowMultiple || false,
        isAnonymous: data.isAnonymous || false,
        visibility: data.visibility || 'PRIVATE'
      }),
    })
    return response
  }

  async voteOnPoll(pollId: string, data: {
    option: string
    ranking?: number
  }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Authentication methods
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    console.log('API Client signIn - sending data:', data)
    console.log('API Client signIn - baseUrl:', this.baseUrl)
    const response = await this.request<{ success: boolean; data: AuthResponse }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    console.log('API Client signIn response:', response)
    return response.data
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const response = await this.request<{ success: boolean; data: AuthResponse }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  // Generic HTTP methods
  async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Utility methods
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health')
  }
}

export const apiClient = new ApiClient()

// Re-export types for convenience
export type { CreateHangoutData } from '@/types/api'