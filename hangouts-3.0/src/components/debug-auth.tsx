'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

export function DebugAuth() {
  const { isSignedIn, isLoaded, user, getToken } = useAuth()

  useEffect(() => {
    console.log('🔍 Auth Debug:', {
      isSignedIn,
      isLoaded,
      user: user ? { id: user.id, email: user.emailAddresses[0]?.emailAddress } : null,
      hasToken: !!getToken
    })
  }, [isSignedIn, isLoaded, user, getToken])

  if (!isLoaded) {
    return <div className="p-4 bg-yellow-100 text-yellow-800">Loading auth...</div>
  }

  return (
    <div className="p-4 bg-blue-100 text-blue-800">
      <h3 className="font-bold">Auth Debug</h3>
      <p>isSignedIn: {isSignedIn ? 'true' : 'false'}</p>
      <p>isLoaded: {isLoaded ? 'true' : 'false'}</p>
      <p>user: {user ? `${user.id} (${user.emailAddresses[0]?.emailAddress})` : 'null'}</p>
      <p>hasToken: {getToken ? 'true' : 'false'}</p>
    </div>
  )
}
