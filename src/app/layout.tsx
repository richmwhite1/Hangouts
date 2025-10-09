import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hangouts 3.0',
  description: 'Plan amazing hangouts with friends',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hangouts 3.0',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6c47ff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
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
                        width: '40px',
                        height: '40px'
                      },
                      userButtonPopoverCard: {
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333'
                      },
                      userButtonPopoverActionButton: {
                        color: '#FFFFFF'
                      },
                      userButtonPopoverActionButton__signOut: {
                        color: '#FF4444'
                      }
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </SignedIn>
            </header>
            
            {/* Main content */}
            <main className="container mx-auto px-4 py-6 max-w-4xl">
              {children}
            </main>
            <BottomNavigation />
          </div>
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  )
}