'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { clearAllAuthData } from '@/lib/sign-out-utils'
import { logger } from '@/lib/logger'

interface SignInPageClientProps {
  redirectUrl: string
}

export function SignInPageClient({ redirectUrl }: SignInPageClientProps) {
  const [isHangoutJoin, setIsHangoutJoin] = useState(false)
  
  // Clear any stale auth data when the sign-in page loads
  // This ensures a clean sign-in experience
  useEffect(() => {
    clearAllAuthData()
    
    // Check if redirect URL is for a public hangout (indicates join flow)
    if (redirectUrl && redirectUrl.includes('/hangouts/public/')) {
      setIsHangoutJoin(true)
      logger.info('Sign-in for hangout join', { redirectUrl })
    }
  }, [redirectUrl])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        {isHangoutJoin && (
          <div className="mb-6 text-center">
            <p className="text-white text-lg font-semibold mb-2">
              Sign in to join the hangout
            </p>
            <p className="text-gray-400 text-sm">
              After signing in, you'll be automatically added as a participant.
            </p>
          </div>
        )}
        <SignIn 
          redirectUrl={redirectUrl}
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'bg-gray-900 border-gray-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
              formFieldInput: 'bg-gray-800 border-gray-600 text-white',
              formFieldLabel: 'text-gray-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300'
            }
          }}
        />
      </div>
    </div>
  )
}

