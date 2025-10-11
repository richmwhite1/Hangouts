import { Metadata } from 'next'
import { generateEventMetadata } from './metadata'

import { logger } from '@/lib/logger'
interface EventPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch event data for metadata
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
    const response = await fetch(`${baseUrl}/api/events/${id}`, {
      cache: 'no-store' // Ensure fresh data for metadata
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.event) {
        return generateEventMetadata(data.event, data.event.isPublic)
      }
    }
  } catch (error) {
    logger.error('Error fetching event metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: 'Event - Hangouts 3.0',
    description: 'Join this event on Hangouts 3.0',
    openGraph: {
      title: 'Event - Hangouts 3.0',
      description: 'Join this event on Hangouts 3.0',
      type: 'website',
      siteName: 'Hangouts 3.0',
    },
  }
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
