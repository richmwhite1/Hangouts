class ClerkApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  }

  private async getHeaders(getToken?: () => Promise<string | null>): Promise<HeadersInit> {
    const token = getToken ? await getToken() : null
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}, getToken?: () => Promise<string | null>): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.getHeaders(getToken)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string, getToken?: () => Promise<string | null>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, getToken)
  }

  async post<T>(endpoint: string, data?: any, getToken?: () => Promise<string | null>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, getToken)
  }

  async put<T>(endpoint: string, data?: any, getToken?: () => Promise<string | null>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }, getToken)
  }

  async delete<T>(endpoint: string, getToken?: () => Promise<string | null>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, getToken)
  }

  // Profile methods
  async getCurrentUser(getToken?: () => Promise<string | null>) {
    return this.get('/api/auth/me', getToken)
  }

  async getProfile(username?: string, getToken?: () => Promise<string | null>) {
    const endpoint = username ? `/api/profile?username=${username}` : '/api/profile?username=current'
    return this.get(endpoint, getToken)
  }

  // Hangout methods
  async getHangouts(getToken?: () => Promise<string | null>) {
    return this.get('/api/hangouts', getToken)
  }

  async createHangout(data: any, getToken?: () => Promise<string | null>) {
    return this.post('/api/hangouts', data, getToken)
  }

  // Discovery methods
  async getPublicHangouts(getToken?: () => Promise<string | null>) {
    return this.get('/api/discover/hangouts', getToken)
  }

  async getPublicEvents(getToken?: () => Promise<string | null>) {
    return this.get('/api/discover/events', getToken)
  }
}

export const clerkApiClient = new ClerkApiClient()
