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
    // 5. We're on a public hangout page OR came from a redirect (indicating they came from sign-in)
    const redirectUrl = searchParams.get('redirect_url')
    const currentPath = window.location.pathname
    const isOnPublicHangoutPage = currentPath.includes('/hangouts/public/')
    
    // Check if redirect_url indicates we came from sign-in to join a hangout
    const cameFromSignIn = redirectUrl && redirectUrl.includes('/hangouts/public/')
    
    logger.info('Auto-join check:', {
      isSignedIn,
      isLoaded,
      hasHangout: !!hangout,
      hasAttemptedJoin,
      privacyLevel: hangout?.privacyLevel,
      redirectUrl,
      currentPath,
      isOnPublicHangoutPage,
      cameFromSignIn,
      currentUserId
    })
    
    if (
      isSignedIn && 
      isLoaded && 
      hangout && 
      !hasAttemptedJoin &&
      hangout.privacyLevel === 'PUBLIC' &&
      (isOnPublicHangoutPage || cameFromSignIn)
    ) {
      const attemptAutoJoin = async (retryCount = 0) => {
        try {
          setHasAttemptedJoin(true)
          
          // Check if user is already a participant (only if we have currentUserId)
          if (currentUserId) {
            const isAlreadyParticipant = hangout.participants?.some(
              (p: any) => p.userId === currentUserId || p.user?.id === currentUserId
            )
            
            if (isAlreadyParticipant) {
              logger.info('User is already a participant, redirecting to authenticated page')
              // Still redirect to authenticated page for better experience
              if (isOnPublicHangoutPage) {
                const hangoutDetailUrl = `/hangout/${hangoutId}`
                window.location.href = hangoutDetailUrl
              }
              return // User is already a participant, no need to join
            }
          }

          // Get auth token
          const token = await getToken()
          if (!token) {
            logger.error('No auth token available for auto-join')
            // Retry once after a short delay
            if (retryCount < 1) {
              setTimeout(() => attemptAutoJoin(retryCount + 1), 500)
            }
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
            const data = await response.json()
            logger.info('Auto-join successful', { hangoutId, data })
            
            toast.success('Welcome! You\'ve been automatically added to this hangout.', {
              description: 'You can now RSVP, vote, and chat with other participants.',
              duration: 4000,
            })
            
            // Always redirect to authenticated hangout page after successful join
            // This provides the full experience (RSVP, voting, chat, etc.)
            const hangoutDetailUrl = `/hangout/${hangoutId}`
            
            // Small delay to let user see the success message
            setTimeout(() => {
              window.location.href = hangoutDetailUrl
            }, 1500)
          } else {
            const errorData = await response.json()
            logger.error('Auto-join failed:', { status: response.status, error: errorData })
            
            // If user is already a participant (400 error), just redirect
            if (response.status === 400 && errorData.error?.includes('already')) {
              logger.info('User already a participant, redirecting')
              const hangoutDetailUrl = `/hangout/${hangoutId}`
              window.location.href = hangoutDetailUrl
            } else {
              // For other errors, show a subtle message and let user manually join
              toast.info('You can join this hangout by clicking the "Join Hangout" button.', {
                duration: 5000,
              })
            }
          }
        } catch (error) {
          logger.error('Error during auto-join:', error)
          // Retry once on network errors
          if (retryCount < 1) {
            setTimeout(() => attemptAutoJoin(retryCount + 1), 1000)
          } else {
            // After retries, show a subtle message
            toast.info('You can join this hangout by clicking the "Join Hangout" button.', {
              duration: 5000,
            })
          }
        }
      }

      // Small delay to ensure the page is fully loaded and auth state is ready
      const timeoutId = setTimeout(() => attemptAutoJoin(0), 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isSignedIn, isLoaded, hangout, hasAttemptedJoin, hangoutId, searchParams, getToken, onJoinSuccess, currentUserId])

  return { hasAttemptedJoin }
}
