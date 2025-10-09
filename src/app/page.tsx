"use client"

import { useAuth, useUser, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Hangouts 3.0</h1>
          <p className="text-gray-400 mb-6">Plan amazing hangouts with friends</p>
          <div className="space-x-4">
            <SignInButton>
              <button className="bg-[#6c47ff] text-white px-4 py-2 rounded-md hover:bg-[#6c47ff]/90">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="border border-gray-300 text-white px-4 py-2 rounded-md hover:bg-gray-800">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome back, {user?.firstName || 'User'}!</h1>
        <p className="text-gray-400 mb-6">Ready to plan some amazing hangouts?</p>
        <div className="space-x-4">
          <a href="/discover" className="bg-[#6c47ff] text-white px-4 py-2 rounded-md hover:bg-[#6c47ff]/90">
            Discover
          </a>
          <a href="/create" className="border border-gray-300 text-white px-4 py-2 rounded-md hover:bg-gray-800">
            Create Hangout
          </a>
        </div>
      </div>
    </div>
  )
}