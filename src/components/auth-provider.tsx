"use client"

import { ReactNode, useEffect, useState } from 'react'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isClient, setIsClient] = useState(false)
  const [ClerkProvider, setClerkProvider] = useState<any>(null)
  const [SignInButton, setSignInButton] = useState<any>(null)
  const [SignUpButton, setSignUpButton] = useState<any>(null)
  const [SignedIn, setSignedIn] = useState<any>(null)
  const [SignedOut, setSignedOut] = useState<any>(null)
  const [UserButton, setUserButton] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import Clerk components only on client side
    if (typeof window !== 'undefined') {
      import('@clerk/nextjs').then((clerk) => {
        setClerkProvider(() => clerk.ClerkProvider)
        setSignInButton(() => clerk.SignInButton)
        setSignUpButton(() => clerk.SignUpButton)
        setSignedIn(() => clerk.SignedIn)
        setSignedOut(() => clerk.SignedOut)
        setUserButton(() => clerk.UserButton)
      }).catch((error) => {
        console.log('Clerk not available:', error)
      })
    }
  }, [])

  // If we're not on client side or Clerk components aren't loaded, render without auth
  if (!isClient || !ClerkProvider) {
    return (
      <div className="min-h-screen bg-background text-foreground dark">
        {/* Header without auth buttons during build */}
        <header className="flex justify-end items-center p-4 gap-4 h-16 border-b border-border">
          <div className="text-gray-400">Loading...</div>
        </header>
        {children}
      </div>
    )
  }

  // Render with Clerk provider
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-background text-foreground dark">
        {/* Header with Clerk auth buttons */}
        <header className="flex justify-end items-center p-4 gap-4 h-16 border-b border-border">
          <SignedOut>
            <SignInButton />
            <SignUpButton>
              <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '2px solid #333333',
                    transition: 'all 0.2s ease'
                  },
                  userButtonPopoverCard: {
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #222222',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(20px)'
                  },
                  userButtonPopoverActionButton: {
                    color: '#e0e0e0',
                    backgroundColor: 'transparent',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#1a1a1a',
                      color: '#ffffff'
                    }
                  },
                  userButtonPopoverActionButton__signOut: {
                    color: '#ff6b6b',
                    '&:hover': {
                      backgroundColor: '#2a1a1a',
                      color: '#ff4444'
                    }
                  },
                  userButtonPopoverHeader: {
                    backgroundColor: '#111111',
                    borderBottom: '1px solid #222222',
                    padding: '12px 16px'
                  },
                  userButtonPopoverFooter: {
                    backgroundColor: '#0a0a0a',
                    borderTop: '1px solid #222222',
                    padding: '8px 16px'
                  },
                  userButtonPopoverMain: {
                    padding: '8px'
                  },
                  userButtonPopoverActionButtonText: {
                    fontSize: '14px',
                    fontWeight: '500'
                  }
                }
              }}
              afterSignOutUrl="/"
            />
          </SignedIn>
        </header>
        {children}
      </div>
    </ClerkProvider>
  )
}
