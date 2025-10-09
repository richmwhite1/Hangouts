// This file is kept for compatibility with existing components
// All new components should use Clerk's useAuth hook directly

import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useAuth() {
  const clerkAuth = useClerkAuth()
  
  // Return a compatible interface for existing components
  return {
    isAuthenticated: clerkAuth.isSignedIn,
    user: clerkAuth.user,
    token: null, // Components should use getToken() from useAuth instead
    signOut: clerkAuth.signOut,
    signIn: () => {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }
}

// Export a default context for compatibility
export const AuthContext = {
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}
