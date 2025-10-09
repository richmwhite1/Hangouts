import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Toaster } from 'sonner'

// Check if we're in build mode
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Conditionally import AuthProvider only if not in build mode
let AuthProvider: any = null
if (!isBuildTime) {
  try {
    const authModule = require('@/components/auth-provider')
    AuthProvider = authModule.AuthProvider
  } catch (error) {
    console.log('AuthProvider not available during build')
  }
}

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
  // If we're in build mode or AuthProvider is not available, render without it
  if (isBuildTime || !AuthProvider) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-background text-foreground dark">
            {/* Header without auth buttons during build */}
            <header className="flex justify-end items-center p-4 gap-4 h-16 border-b border-border">
              <div className="text-gray-400">Loading...</div>
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
    )
  }

  // Normal rendering with AuthProvider
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground dark">
            {/* Main content */}
            <main className="container mx-auto px-4 py-6 max-w-4xl">
              {children}
            </main>
            <BottomNavigation />
          </div>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}