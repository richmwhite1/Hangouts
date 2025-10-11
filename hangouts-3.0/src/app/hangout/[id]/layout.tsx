import { Metadata } from 'next'
import { generateHangoutMetadata } from './metadata'

import { logger } from '@/lib/logger'
interface HangoutPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: HangoutPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch hangout data for metadata
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
    const response = await fetch(`${baseUrl}/api/hangouts/${id}`, {
      cache: 'no-store' // Ensure fresh data for metadata
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.hangout) {
        return generateHangoutMetadata(data.hangout, data.hangout.privacyLevel === 'PUBLIC')
      }
    }
  } catch (error) {
    logger.error('Error fetching hangout metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: 'Hangout - Hangouts 3.0',
    description: 'Join this hangout on Hangouts 3.0',
    openGraph: {
      title: 'Hangout - Hangouts 3.0',
      description: 'Join this hangout on Hangouts 3.0',
      type: 'website',
      siteName: 'Hangouts 3.0',
    },
  }
}

export default function HangoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
