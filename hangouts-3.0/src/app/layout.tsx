import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hangouts 3.0',
  description: 'Plan amazing hangouts with friends'}

export default function RootLayout({
  children}: {
  children: React.ReactNode
}) {
  // Check if Clerk keys are valid
  const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')
  
  if (!hasValidClerkKeys) {
    // Render without Clerk provider if keys are invalid or empty
    return (
      <html lang="en">
        <body className={inter.className}>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground dark">
              <main className="container mx-auto px-4 py-6 max-w-4xl">
                {children}
              </main>
              <BottomNavigation />
            </div>
          </AuthProvider>
          <Toaster position="top-right" richColors />
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <AuthProvider>
            <RealtimeProvider>
              <WebSocketProvider>
                <div className="min-h-screen bg-background text-foreground dark">
                  {/* Navigation is handled by individual pages */}
                  <main className="container mx-auto px-4 py-6 max-w-4xl">
                    {children}
                  </main>
                  <BottomNavigation />
                </div>
                <Toaster position="top-right" richColors />
              </WebSocketProvider>
            </RealtimeProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}