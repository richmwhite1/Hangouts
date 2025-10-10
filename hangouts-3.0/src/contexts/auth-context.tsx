"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs'
import { User } from '@/types/api'

interface AuthContextType {
  user: User | null
  isClerkUser: boolean
  signOut: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Check if Clerk keys are valid
  const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')
  
  // Skip Clerk hooks if keys are invalid
  const clerkAuth = hasValidClerkKeys ? useClerkAuth() : { isSignedIn: false, signOut: () => {}, isLoaded: true }
  const clerkUser = hasValidClerkKeys ? useClerkUser() : { user: null }
  
  const { isSignedIn, signOut: clerkSignOut, isLoaded: clerkIsLoaded } = clerkAuth
  const { user: clerkUserData } = clerkUser
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClerkUser, setIsClerkUser] = useState(false)

  // Remove unused variable

  const clearAuthState = () => {
    setUser(null)
    setIsClerkUser(false)
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      // Skip Clerk initialization if keys are invalid
      if (!hasValidClerkKeys) {
        console.log('⚠️ Skipping Clerk authentication due to invalid keys')
        setIsLoading(false)
        return
      }

      if (!clerkIsLoaded) {
        setIsLoading(true)
        return
      }

      try {
        if (isSignedIn && clerkUserData) {
          setIsClerkUser(true)

          // Sync user with database
          try {
            const response = await fetch('/api/auth/sync-clerk-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                clerkId: clerkUserData.id,
                email: clerkUserData.emailAddresses[0]?.emailAddress,
                username: clerkUserData.username,
                name: `${clerkUserData.firstName} ${clerkUserData.lastName}`.trim(),
                avatar: clerkUserData.imageUrl
              })
            })

            if (response.ok) {
              const { data } = await response.json()
              setUser(data.user)
            } else {
              console.error('Failed to sync Clerk user:', await response.text())
              clearAuthState()
            }
          } catch (error) {
            console.error('Error syncing Clerk user:', error)
            clearAuthState()
          }
        } else {
          clearAuthState()
        }
      } catch (error) {
        console.error('Auth: Initialization error:', error)
        clearAuthState()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [isSignedIn, clerkUserData, clerkIsLoaded, hasValidClerkKeys])

  const signOut = async () => {
    try {
      // Clear local state first
      clearAuthState()
      
      // Then sign out from Clerk
      if (hasValidClerkKeys && clerkSignOut) {
        await clerkSignOut()
      }
      
      // Redirect to home page after sign out
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Error during sign out:', error)
      // Still clear local state even if Clerk sign out fails
      clearAuthState()
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  const value: AuthContextType = {
    user,
    isClerkUser,
    signOut,
    isLoading,
    isAuthenticated: hasValidClerkKeys ? (isSignedIn || false) : false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


