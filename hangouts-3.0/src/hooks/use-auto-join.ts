import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface UseAutoJoinProps {
  hangoutId: string
  hangout: any
  currentUserId?: string
  onJoinSuccess?: () => void
}

export function useAutoJoin({ hangoutId, hangout, currentUserId, onJoinSuccess }: UseAutoJoinProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const searchParams = useSearchParams()
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false)

  useEffect(() => {
    // Only attempt auto-join if:
    // 1. User is signed in and loaded
    // 2. We have a hangout
    // 3. We haven't already attempted to join
    // 4. The hangout is public
    // 5. There's a redirect_url parameter (indicating they came from sign-in)
    if (
      isSignedIn && 
      isLoaded && 
      hangout && 
      !hasAttemptedJoin &&
      hangout.privacyLevel === 'PUBLIC' &&
      searchParams.get('redirect_url')
    ) {
      const attemptAutoJoin = async () => {
        try {
          setHasAttemptedJoin(true)
          
          // Check if user is already a participant
          const isAlreadyParticipant = hangout.participants?.some(
            (p: any) => p.userId === currentUserId
          )
          
          if (isAlreadyParticipant) {
            return // User is already a participant, no need to join
          }

          // Get auth token
          const token = await getToken()
          if (!token) {
            logger.error('No auth token available for auto-join')
            return
          }

          // Attempt to join the hangout
          const response = await fetch(`/api/hangouts/${hangoutId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            toast.success('Welcome! You\'ve been automatically added to this hangout.')
            
            // Redirect to the authenticated hangout detail page
            const hangoutDetailUrl = `/hangout/${hangoutId}`
            window.location.href = hangoutDetailUrl
            
            if (onJoinSuccess) {
              onJoinSuccess()
            }
          } else {
            const errorData = await response.json()
            logger.error('Auto-join failed:', errorData)
            // Don't show error toast for auto-join failures to avoid spam
          }
        } catch (error) {
          logger.error('Error during auto-join:', error)
          // Don't show error toast for auto-join failures to avoid spam
        }
      }

      // Small delay to ensure the page is fully loaded
      const timeoutId = setTimeout(attemptAutoJoin, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isSignedIn, isLoaded, hangout, hasAttemptedJoin, hangoutId, searchParams, getToken, onJoinSuccess])

  return { hasAttemptedJoin }
}
