"use client"

import { useEffect, useState } from 'react'

interface ClerkAuth {
  isSignedIn: boolean
  isLoaded: boolean
  getToken: () => Promise<string | null>
  user: any
}

export function useClerkAuth(): ClerkAuth {
  const [auth, setAuth] = useState<ClerkAuth>({
    isSignedIn: false,
    isLoaded: false,
    getToken: async () => null,
    user: null
  })

  useEffect(() => {
    // Only load Clerk on client side
    if (typeof window !== 'undefined') {
      import('@clerk/nextjs').then((clerk) => {
        const { useAuth, useUser } = clerk
        
        // This is a bit of a hack, but we need to call the hooks conditionally
        try {
          const authResult = useAuth()
          const userResult = useUser()
          
          setAuth({
            isSignedIn: authResult.isSignedIn,
            isLoaded: authResult.isLoaded,
            getToken: authResult.getToken,
            user: userResult.user
          })
        } catch (error) {
          console.log('Clerk hooks not available:', error)
          setAuth(prev => ({ ...prev, isLoaded: true }))
        }
      }).catch((error) => {
        console.log('Clerk not available:', error)
        setAuth(prev => ({ ...prev, isLoaded: true }))
      })
    } else {
      // Server side - return default values
      setAuth(prev => ({ ...prev, isLoaded: true }))
    }
  }, [])

  return auth
}
