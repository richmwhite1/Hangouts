'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect } from 'react'
import { clearAllAuthData } from '@/lib/sign-out-utils'

interface SignInPageClientProps {
  redirectUrl: string
}

export function SignInPageClient({ redirectUrl }: SignInPageClientProps) {
  // Clear any stale auth data when the sign-in page loads
  // This ensures a clean sign-in experience
  useEffect(() => {
    clearAllAuthData()
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md">
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

