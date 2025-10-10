'use client'

import { useAuth } from '@clerk/nextjs'

export function ClerkDebug() {
  const { isSignedIn, isLoaded, userId } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk Debug Info</h1>
      <div className="space-y-2">
        <p><strong>isLoaded:</strong> {isLoaded ? 'true' : 'false'}</p>
        <p><strong>isSignedIn:</strong> {isSignedIn ? 'true' : 'false'}</p>
        <p><strong>userId:</strong> {userId || 'null'}</p>
      </div>
      
      {!isLoaded && (
        <div className="mt-8 p-4 bg-yellow-900 rounded">
          <p>Clerk is still loading...</p>
        </div>
      )}
      
      {isLoaded && !isSignedIn && (
        <div className="mt-8 p-4 bg-blue-900 rounded">
          <p>User is not signed in - showing guest content</p>
          <a href="/signin" className="text-blue-300 underline">Sign In</a>
        </div>
      )}
      
      {isLoaded && isSignedIn && (
        <div className="mt-8 p-4 bg-green-900 rounded">
          <p>User is signed in!</p>
          <p>User ID: {userId}</p>
        </div>
      )}
    </div>
  )
}
