"use client"

import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // User is signed in, redirect to discover page
      router.push('/discover')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold mb-4 text-white">Hangouts 3.0</h1>
        <p className="text-gray-400 mb-8 text-lg">Plan amazing hangouts with friends</p>
        
        {!isSignedIn ? (
          <div className="space-y-4">
            <a 
              href="/login" 
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Sign In
            </a>
            <a 
              href="/signup" 
              className="block w-full border border-gray-600 hover:border-gray-500 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Sign Up
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-green-400 mb-4">Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!</p>
            <div className="flex gap-4 justify-center">
              <a 
                href="/discover" 
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Discover
              </a>
              <a 
                href="/create" 
                className="border border-gray-600 hover:border-gray-500 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Create Hangout
              </a>
            </div>
          </div>
        )}
        
        <p className="text-gray-500 text-sm mt-8">
          Powered by Clerk Authentication
        </p>
      </div>
    </div>
  )
}