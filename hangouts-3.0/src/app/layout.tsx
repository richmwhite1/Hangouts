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
import { PWASetup } from '@/components/pwa-setup'
import { NetworkStatus } from '@/components/network-status'
import { InstallPrompt } from '@/components/install-prompt'
// import { PWANavigationFix } from '@/components/pwa-navigation-fix'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Hangouts 3.0',
  description: 'Plan amazing hangouts with friends',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hangouts 3.0'
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8B5CF6'
}

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
          {/* PWA Meta Tags */}
          <meta name="theme-color" content="#8B5CF6" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Hangouts" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#8B5CF6" />
          <meta name="msapplication-tap-highlight" content="no" />
          
          {/* Apple Touch Icons */}
          <link rel="apple-touch-icon" href="/icon-192x192.png" />
          <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
          <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
          
          {/* Windows Tiles */}
          <meta name="msapplication-TileImage" content="/icon-192x192.png" />
          
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
                  <PWASetup />
                  <NetworkStatus />
                  <InstallPrompt showForAllUsers={true} />
                  {/* <PWANavigationFix /> */}
                </WebSocketProvider>
            </RealtimeProvider>
          </GlobalErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}