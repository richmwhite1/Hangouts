import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Toaster } from 'sonner'
import { ClerkProvider } from '@clerk/nextjs'

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