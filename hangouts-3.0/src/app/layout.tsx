import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Navigation } from '@/components/navigation'
import { GlobalErrorBoundary } from '@/components/global-error-boundary'
import { Toaster } from 'sonner'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Hangouts 3.0',
  description: 'Plan amazing hangouts with friends'}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" className="dark">
        <head>
          {/* Heroicons are imported as React components, not as scripts */}
        </head>
        <body className={inter.className}>
          <GlobalErrorBoundary>
            <RealtimeProvider>
                <WebSocketProvider>
                  <div className="min-h-screen bg-background text-foreground dark pb-20">
                    <Navigation />
                    <main className="container mx-auto px-4 py-6 max-w-4xl">
                      <div className="space-y-6">
                        {children}
                      </div>
                    </main>
                    <BottomNavigation />
                  </div>
                  <Toaster position="top-right" richColors />
                </WebSocketProvider>
            </RealtimeProvider>
          </GlobalErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}