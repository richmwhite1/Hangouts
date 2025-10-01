'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function DebugAuthPage() {
  const { user, token, isAuthenticated, clearAuthState } = useAuth()
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any>({})

  const loadFriends = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get('/api/friends')
      console.log('Friends response:', response)
      setFriends(response.data?.friends || [])
      setTestResults(prev => ({ ...prev, friends: 'SUCCESS' }))
    } catch (err) {
      console.error('Error loading friends:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setTestResults(prev => ({ ...prev, friends: 'FAILED' }))
    } finally {
      setLoading(false)
    }
  }

  const testHangoutCreation = async () => {
    try {
      setLoading(true)
      const response = await apiClient.post('/api/hangouts', {
        title: 'Debug Test Hangout',
        description: 'Testing hangout creation',
        type: 'quick_plan',
        privacyLevel: 'PUBLIC',
        options: [{
          title: 'Test Option',
          description: 'Testing',
          location: 'Test Location',
          dateTime: '2025-01-25T15:00:00Z',
          price: 10,
          hangoutUrl: ''
        }]
      })
      console.log('Hangout creation response:', response)
      setTestResults(prev => ({ ...prev, hangout: 'SUCCESS' }))
    } catch (err) {
      console.error('Error creating hangout:', err)
      setTestResults(prev => ({ ...prev, hangout: 'FAILED' }))
    } finally {
      setLoading(false)
    }
  }

  const clearAuth = () => {
    clearAuthState()
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  const login = async () => {
    try {
      const response = await apiClient.post('/api/auth/signin', {
        email: 'karl@example.com',
        password: 'Password1!'
      })
      console.log('Login response:', response)
      if (response.success) {
        // Store the auth data
        localStorage.setItem('auth_token', response.data.token)
        localStorage.setItem('auth_user', JSON.stringify(response.data.user))
        window.location.reload()
      }
    } catch (err) {
      console.error('Login error:', err)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadFriends()
    }
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Authentication</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {user ? JSON.stringify(user, null, 2) : 'None'}</p>
          <p>Token: {token ? `${token.substring(0, 50)}...` : 'None'}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <button 
              onClick={login}
              className="bg-green-600 px-4 py-2 rounded"
            >
              Login as Karl
            </button>
            <button 
              onClick={loadFriends}
              disabled={loading}
              className="bg-purple-600 px-4 py-2 rounded"
            >
              {loading ? 'Loading...' : 'Load Friends'}
            </button>
            <button 
              onClick={testHangoutCreation}
              disabled={loading}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              Test Hangout Creation
            </button>
            <button 
              onClick={clearAuth}
              className="bg-red-600 px-4 py-2 rounded"
            >
              Clear Auth & Reload
            </button>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Results</h2>
          <div className="space-y-2">
            <p>Friends: {testResults.friends || 'Not tested'}</p>
            <p>Hangout: {testResults.hangout || 'Not tested'}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 p-4 rounded-lg">
            <h3 className="font-semibold">Error:</h3>
            <p>{error}</p>
          </div>
        )}
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Friends ({friends.length})</h2>
          <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(friends, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

