import type { Metadata } from 'next'
import { Oswald, Roboto } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { NotificationProvider } from '@/contexts/notification-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Navigation } from '@/components/navigation'
import { GlobalErrorBoundary } from '@/components/global-error-boundary'
import { Toaster } from 'sonner'
import { PWASetup } from '@/components/pwa-setup'
import { NetworkStatus } from '@/components/network-status'
import { InstallPrompt } from '@/components/install-prompt'

// import { ConsoleErrorHandler } from '@/components/console-error-handler' // Removed - causes webpack bundling issues
// import { PWANavigationFix } from '@/components/pwa-navigation-fix'

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-oswald'
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto'
})

export const metadata: Metadata = {
  title: 'Plans',
  description: 'Plan amazing hangouts with friends',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Plans'
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
  themeColor: '#2563EB'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Suppress Clerk warnings in production, log in development
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!clerkKey && process.env.NODE_ENV === 'development') {
    // Clerk publishable key not found - this is expected in some environments
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      dynamic
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang="en" className={`dark ${oswald.variable} ${roboto.variable}`}>
        <head>
          {/* Viewport for iPhone safe areas */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

          {/* PWA Meta Tags */}
          <meta name="theme-color" content="#2563EB" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Plans" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#2563EB" />
          <meta name="msapplication-tap-highlight" content="no" />

          {/* Apple Touch Icons */}
          <link rel="apple-touch-icon" href="/icon-192x192.png" />
          <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
          <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />

          {/* Windows Tiles */}
          <meta name="msapplication-TileImage" content="/icon-192x192.png" />

          {/* Unregister service worker in development */}
          {process.env.NODE_ENV === 'development' && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  if ('serviceWorker' in navigator && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      registrations.forEach(reg => reg.unregister());
                    });
                  }
                `
              }}
            />
          )}

          {/* Heroicons are imported as React components, not as scripts */}
        </head>
        <body className={roboto.className}>
          <GlobalErrorBoundary>
            <RealtimeProvider>
              <WebSocketProvider>
                <NotificationProvider>
                  <div className="min-h-screen bg-background text-foreground dark pb-20">
                    <Navigation />
                    <main className="container mx-auto px-4 py-6 max-w-4xl">
                      {children}
                    </main>
                    <div suppressHydrationWarning>
                      <BottomNavigation />
                    </div>
                  </div>
                  <Toaster position="top-right" richColors />
                  <PWASetup />
                  <NetworkStatus />
                  <InstallPrompt showForAllUsers={true} />

                </NotificationProvider>
              </WebSocketProvider>
            </RealtimeProvider>
          </GlobalErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}