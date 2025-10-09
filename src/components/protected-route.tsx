"use client"

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/login')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6c47ff] mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to access this page.
          </p>
          <a 
            href="/login" 
            className="bg-[#6c47ff] text-white px-6 py-3 rounded-md hover:bg-[#5a3fd4] inline-block"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}




