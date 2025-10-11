import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { GlobalErrorBoundary } from '@/components/global-error-boundary'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hangouts 3.0',
  description: 'Plan amazing hangouts with friends'}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <GlobalErrorBoundary>
            <AuthProvider>
              <RealtimeProvider>
                <WebSocketProvider>
                  <div className="min-h-screen bg-background text-foreground dark pb-20">
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
          </GlobalErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}