// Simple API client for Clerk authentication
export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Friends API methods
  async getFriends() {
    return this.get<{ friends: any[] }>('/api/friends')
  }

  async getFriendRequests() {
    return this.get<{ sent: any[], received: any[] }>('/api/friends/requests')
  }

  async sendFriendRequest(userId: string, message?: string) {
    return this.post('/api/friends/request', { userId, message })
  }

  async respondToFriendRequest(requestId: string, status: 'ACCEPTED' | 'DECLINED') {
    return this.put(`/api/friends/requests/${requestId}`, { status })
  }

  async cancelFriendRequest(requestId: string) {
    return this.delete(`/api/friends/requests/${requestId}`)
  }

  async searchUsers(query: string, limit: number = 20, offset: number = 0) {
    return this.get<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`)
  }

  // Legacy methods for backward compatibility
  async signIn(_data: any) {
    throw new Error('Sign in is now handled by Clerk. Use Clerk components instead.')
  }

  async signUp(_data: any) {
    throw new Error('Sign up is now handled by Clerk. Use Clerk components instead.')
  }
}

export const apiClient = new ApiClient()
