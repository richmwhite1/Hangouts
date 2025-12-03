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
  const [joinStatus, setJoinStatus] = useState<'idle' | 'joining' | 'success' | 'error'>('idle')

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
      currentUserId,
      joinStatus
    })
    
    if (
      isSignedIn && 
      isLoaded && 
      hangout && 
      !hasAttemptedJoin &&
      hangout.privacyLevel === 'PUBLIC' &&
      (isOnPublicHangoutPage || cameFromSignIn) &&
      joinStatus === 'idle'
    ) {
      const attemptAutoJoin = async (retryCount = 0) => {
        try {
          setHasAttemptedJoin(true)
          setJoinStatus('joining')
          
          // Check if user is already a participant (only if we have currentUserId)
          if (currentUserId) {
            const isAlreadyParticipant = hangout.participants?.some(
              (p: any) => p.userId === currentUserId || p.user?.id === currentUserId
            )
            
            if (isAlreadyParticipant) {
              logger.info('User is already a participant, redirecting to authenticated page')
              setJoinStatus('success')
              
              // Show success message
              toast.success('Welcome back!', {
                description: 'You\'re already part of this hangout.',
                duration: 3000,
              })
              
              // Redirect to authenticated page for better experience
              if (isOnPublicHangoutPage) {
                const hangoutDetailUrl = `/hangout/${hangoutId}`
                setTimeout(() => {
                  window.location.href = hangoutDetailUrl
                }, 1500)
              }
              return
            }
          }

          // Get auth token with exponential backoff
          let token = await getToken()
          if (!token && retryCount < 3) {
            logger.warn(`No auth token available, retrying... (attempt ${retryCount + 1})`)
            // Exponential backoff: 500ms, 1000ms, 2000ms
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)))
            token = await getToken()
          }

          if (!token) {
            logger.error('No auth token available for auto-join after retries')
            setJoinStatus('error')
            toast.error('Authentication issue. Please try refreshing the page.', {
              duration: 5000,
            })
            return
          }

          // Attempt to join the hangout
          logger.info('Attempting to join hangout', { hangoutId, retryCount })
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
            setJoinStatus('success')
            
            // Call success callback if provided
            if (onJoinSuccess) {
              onJoinSuccess()
            }
            
            toast.success('🎉 You\'ve joined the hangout!', {
              description: 'Redirecting you to the full experience...',
              duration: 4000,
            })
            
            // Always redirect to authenticated hangout page after successful join
            // This provides the full experience (RSVP, voting, chat, etc.)
            const hangoutDetailUrl = `/hangout/${hangoutId}`
            
            // Delay to let user see the success message
            setTimeout(() => {
              window.location.href = hangoutDetailUrl
            }, 2000)
          } else {
            const errorData = await response.json()
            logger.error('Auto-join failed:', { status: response.status, error: errorData })
            
            // If user is already a participant (400 error), just redirect
            if (response.status === 400 && errorData.error?.includes('already')) {
              logger.info('User already a participant, redirecting')
              setJoinStatus('success')
              
              toast.success('Welcome back!', {
                description: 'You\'re already part of this hangout.',
                duration: 3000,
              })
              
              const hangoutDetailUrl = `/hangout/${hangoutId}`
              setTimeout(() => {
                window.location.href = hangoutDetailUrl
              }, 1500)
            } else if (retryCount < 2) {
              // Retry with exponential backoff for server errors
              logger.warn(`Auto-join failed, retrying... (attempt ${retryCount + 1})`)
              setJoinStatus('idle')
              setHasAttemptedJoin(false)
              setTimeout(() => attemptAutoJoin(retryCount + 1), 1000 * Math.pow(2, retryCount))
            } else {
              // After all retries failed
              setJoinStatus('error')
              toast.error('Couldn\'t join automatically', {
                description: 'Click "Join Hangout" to try again.',
                duration: 6000,
              })
            }
          }
        } catch (error) {
          logger.error('Error during auto-join:', error)
          
          // Retry on network errors with exponential backoff
          if (retryCount < 2) {
            logger.warn(`Network error during auto-join, retrying... (attempt ${retryCount + 1})`)
            setJoinStatus('idle')
            setHasAttemptedJoin(false)
            setTimeout(() => attemptAutoJoin(retryCount + 1), 1000 * Math.pow(2, retryCount))
          } else {
            // After all retries, show error message
            setJoinStatus('error')
            toast.error('Connection issue', {
              description: 'Please check your internet and try joining manually.',
              duration: 6000,
            })
          }
        }
      }

      // Small delay to ensure the page is fully loaded and auth state is ready
      const timeoutId = setTimeout(() => attemptAutoJoin(0), 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isSignedIn, isLoaded, hangout, hasAttemptedJoin, hangoutId, searchParams, getToken, onJoinSuccess, currentUserId, joinStatus])

  return { hasAttemptedJoin, joinStatus }
}
