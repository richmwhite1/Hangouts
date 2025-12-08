/**
 * Comprehensive sign-out utility that ensures all authentication state is cleared
 */

/**
 * Clears all authentication-related data from browser storage
 */
export function clearAllAuthData() {
  // Clear all possible auth-related keys from localStorage
  const localStorageKeys = [
    'auth_token',
    'auth_user',
    'token',
    'user',
    'access_token',
    'refresh_token',
    'jwt_token',
    'authToken',
    'authUser',
    'userToken',
    'userData',
    'clerk-session',
    '__clerk_db_jwt',
    '__clerk_client_jwt',
  ]

  localStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      // Ignore errors (e.g., in private browsing mode)
    }
  })

  // Clear all possible auth-related keys from sessionStorage
  const sessionStorageKeys = [
    'auth_token',
    'auth_user',
    'token',
    'user',
    'access_token',
    'refresh_token',
    'jwt_token',
    'authToken',
    'authUser',
    'userToken',
    'userData',
    'clerk-session',
  ]

  sessionStorageKeys.forEach(key => {
    try {
      sessionStorage.removeItem(key)
    } catch (e) {
      // Ignore errors
    }
  })

  // Clear all cookies that might contain auth data
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      
      // Clear auth-related cookies
      if (
        name.includes('auth') ||
        name.includes('token') ||
        name.includes('session') ||
        name.includes('clerk')
      ) {
        // Clear cookie by setting it to expire in the past
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
      }
    })
  }
}

// Track sign-out state to prevent multiple simultaneous sign-outs
let isSigningOut = false
let signOutPromise: Promise<void> | null = null

/**
 * Performs a complete sign-out process with rate limiting protection
 * @param clerkSignOut - Clerk's signOut function
 * @param redirectUrl - URL to redirect to after sign-out (default: '/')
 */
export async function performSignOut(
  clerkSignOut: (options?: { redirectUrl?: string }) => Promise<void>,
  redirectUrl: string = '/'
): Promise<void> {
  // Prevent multiple simultaneous sign-out attempts
  if (isSigningOut && signOutPromise) {
    return signOutPromise
  }

  isSigningOut = true
  signOutPromise = (async () => {
    try {
      // Cancel any ongoing requests first
      if (typeof window !== 'undefined') {
        window.stop?.()
      }
      
      // Clear local auth data first (before Clerk call to avoid rate limiting)
      clearAllAuthData()

      // Add timeout to prevent hanging on rate-limited requests
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      })

      // Sign out from Clerk with redirectUrl - Clerk will handle the redirect
      // This prevents multiple requests and rate limiting issues
      await Promise.race([
        clerkSignOut({ redirectUrl }),
        timeoutPromise
      ])
    } catch (error: any) {
      // Log error but don't throw - we'll handle it gracefully
      const errorMessage = error?.message || 'Unknown sign-out error'
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests')
      
      console.warn('Sign out error (handling gracefully):', errorMessage)
      
      // Even if Clerk sign-out fails (especially rate limits), clear all local data and redirect
      clearAllAuthData()
      
      // For rate limiting or timeout, force immediate redirect
      if (isRateLimit || errorMessage.includes('timeout')) {
        if (typeof window !== 'undefined') {
          // Use replace instead of href to prevent back button issues
          window.location.replace(redirectUrl)
        }
        return
      }
      
      // For other errors, try redirect after a brief delay
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.replace(redirectUrl)
        }, 500)
      }
    } finally {
      // Reset state after a delay to allow redirect to happen
      setTimeout(() => {
        isSigningOut = false
        signOutPromise = null
      }, 2000)
    }
  })()

  return signOutPromise
}

