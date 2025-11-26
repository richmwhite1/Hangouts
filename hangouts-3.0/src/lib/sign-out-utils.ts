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

/**
 * Performs a complete sign-out process
 * @param clerkSignOut - Clerk's signOut function
 * @param redirectUrl - URL to redirect to after sign-out (default: '/')
 */
export async function performSignOut(
  clerkSignOut: (options?: { redirectUrl?: string }) => Promise<void>,
  redirectUrl: string = '/'
): Promise<void> {
  try {
    // Cancel any ongoing requests first
    if (typeof window !== 'undefined') {
      window.stop?.()
    }
    
    // Clear local auth data first
    clearAllAuthData()

    // Sign out from Clerk with redirectUrl - Clerk will handle the redirect
    // This prevents multiple requests and rate limiting issues
    await clerkSignOut({ redirectUrl })
  } catch (error) {
    console.error('Sign out error:', error)
    
    // Even if Clerk sign-out fails, clear all local data and redirect
    clearAllAuthData()
    
    // Force redirect as fallback
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl
    }
  }
}

