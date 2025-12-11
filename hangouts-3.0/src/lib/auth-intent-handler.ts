/**
 * Auth Intent Handler
 * Manages storing and retrieving authentication intents during OAuth flows
 * Uses sessionStorage with URL parameter fallback and 10-minute expiry
 */

export interface AuthIntent {
  action: string
  hangoutId?: string
  returnTo?: string
  timestamp: number
}

export class AuthIntentHandler {
  private static readonly STORAGE_KEY = 'authIntent'
  private static readonly EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

  /**
   * Store an authentication intent before redirecting to auth
   */
  static storeIntent(action: string, hangoutId?: string, returnTo?: string): AuthIntent {
    const intent: AuthIntent = {
      action,
      hangoutId,
      returnTo: returnTo || window.location.href,
      timestamp: Date.now()
    }

    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(intent))

      // Also add to URL as fallback
      const url = new URL(window.location.href)
      url.searchParams.set('auth_action', action)
      if (hangoutId) url.searchParams.set('hangout_id', hangoutId)
      if (returnTo) url.searchParams.set('return_to', returnTo)
      url.searchParams.set('intent_timestamp', intent.timestamp.toString())

      // Update URL without causing a navigation
      window.history.replaceState(null, '', url.toString())
    } catch (error) {
      console.error('Failed to store auth intent:', error)
    }

    return intent
  }

  /**
   * Retrieve stored authentication intent
   * Checks both sessionStorage and URL parameters
   */
  static getIntent(): AuthIntent | null {
    try {
      // First try sessionStorage
      const stored = sessionStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const intent: AuthIntent = JSON.parse(stored)

        // Check if expired
        if (Date.now() - intent.timestamp > this.EXPIRY_MS) {
          this.clearIntent()
          return null
        }

        return intent
      }

      // Fallback to URL parameters
      const url = new URL(window.location.href)
      const action = url.searchParams.get('auth_action')
      const hangoutId = url.searchParams.get('hangout_id')
      const returnTo = url.searchParams.get('return_to')
      const timestampStr = url.searchParams.get('intent_timestamp')

      if (action && timestampStr) {
        const timestamp = parseInt(timestampStr, 10)

        // Check if expired
        if (Date.now() - timestamp > this.EXPIRY_MS) {
          this.clearIntent()
          return null
        }

        return {
          action,
          hangoutId: hangoutId || undefined,
          returnTo: returnTo || undefined,
          timestamp
        }
      }
    } catch (error) {
      console.error('Failed to retrieve auth intent:', error)
    }

    return null
  }

  /**
   * Clear stored authentication intent
   */
  static clearIntent(): void {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY)

      // Also clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('auth_action')
      url.searchParams.delete('hangout_id')
      url.searchParams.delete('return_to')
      url.searchParams.delete('intent_timestamp')

      // Update URL without causing a navigation
      window.history.replaceState(null, '', url.toString())
    } catch (error) {
      console.error('Failed to clear auth intent:', error)
    }
  }

  /**
   * Check if there's a valid stored intent
   */
  static hasIntent(): boolean {
    return this.getIntent() !== null
  }

  /**
   * Execute the stored intent by making the appropriate API call
   */
  static async executeIntent(): Promise<{ success: boolean; redirectTo?: string; error?: string }> {
    const intent = this.getIntent()
    if (!intent) {
      return { success: false, error: 'No valid intent found' }
    }

    try {
      if (intent.action === 'join' && intent.hangoutId) {
        // Execute join action
        const response = await fetch(`/api/auth/execute-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: intent.action,
            hangoutId: intent.hangoutId
          })
        })

        if (response.ok) {
          const result = await response.json()
          this.clearIntent()
          return {
            success: true,
            redirectTo: result.redirectTo || intent.returnTo
          }
        } else {
          const errorData = await response.json()
          return {
            success: false,
            error: errorData.error || 'Failed to execute intent'
          }
        }
      } else if (intent.action === 'view_friends_only') {
        // For friends-only access, just redirect to the original URL
        const redirectTo = intent.returnTo || `/hangout/${intent.hangoutId}`
        this.clearIntent()
        return { success: true, redirectTo }
      }

      return { success: false, error: 'Unknown intent action' }
    } catch (error) {
      console.error('Failed to execute auth intent:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute intent'
      }
    }
  }
}