"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient, User, SignInData, SignUpData } from '@/lib/api-client'

interface AuthContextType {
  user: User | null
  token: string | null
  signIn: (data: SignInData) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => void
  clearAuthState: () => void
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
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  const clearAuthState = () => {
    setUser(null)
    setToken(null)
    apiClient.setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')
        
        if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
          try {
            const parsedUser = JSON.parse(storedUser)
            
            // Set token first before making API call
            apiClient.setToken(storedToken)
            
            // Validate token by making a test API call
            const testResponse = await apiClient.get('/api/auth/me')
            if (!testResponse.success) {
              console.log('Auth: Token validation failed, clearing auth state')
              clearAuthState()
              return
            }
            
            setToken(storedToken)
            setUser(parsedUser)
            console.log('Auth: Valid token found, user authenticated')
          } catch (error) {
            console.error('Auth: Token validation error:', error)
            clearAuthState()
          }
        } else {
          console.log('Auth: No stored auth data found')
        }
      } catch (error) {
        console.error('Auth: Initialization error:', error)
        clearAuthState()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signIn = async (data: SignInData) => {
    try {
      setIsLoading(true)
      const { user, token } = await apiClient.signIn(data)
      
      setUser(user)
      setToken(token)
      apiClient.setToken(token)
      
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      setIsLoading(true)
      const { user, token } = await apiClient.signUp(data)
      
      setUser(user)
      setToken(token)
      apiClient.setToken(token)
      
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    clearAuthState()
  }

  const value: AuthContextType = {
    user,
    token,
    signIn,
    signUp,
    signOut,
    clearAuthState,
    isLoading,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

