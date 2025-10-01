'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function TestAuthPage() {
  const { user, token, isAuthenticated } = useAuth()
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFriends = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get('/api/friends')
      console.log('Friends response:', response)
      setFriends(response.data?.friends || [])
    } catch (err) {
      console.error('Error loading friends:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const clearAuth = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadFriends()
    }
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {user ? JSON.stringify(user, null, 2) : 'None'}</p>
          <p>Token: {token ? `${token.substring(0, 50)}...` : 'None'}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Friends</h2>
          <button 
            onClick={loadFriends}
            disabled={loading}
            className="bg-purple-600 px-4 py-2 rounded mr-2"
          >
            {loading ? 'Loading...' : 'Load Friends'}
          </button>
          <button 
            onClick={clearAuth}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Clear Auth & Reload
          </button>
          
          {error && (
            <div className="text-red-400 mt-2">
              Error: {error}
            </div>
          )}
          
          <div className="mt-4">
            <p>Friends count: {friends.length}</p>
            <pre className="bg-gray-800 p-4 rounded mt-2 text-sm overflow-auto">
              {JSON.stringify(friends, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

