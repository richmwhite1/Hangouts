import { Metadata } from 'next'
import { PublicEventViewer } from './public-event-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  // For now, return basic metadata that will work for iPhone sharing
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return {
    title: `Event - Hangouts 3.0`,
    description: 'Join this event and connect with friends!',
    openGraph: {
      title: `Event - Hangouts 3.0`,
      description: 'Join this event and connect with friends!',
      url: `${baseUrl}/events/public/${id}`,
      siteName: 'Hangouts 3.0',
      type: 'website',
      images: [{
        url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
        width: 1200,
        height: 630,
        alt: 'Event',
      }],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Event - Hangouts 3.0`,
      description: 'Join this event and connect with friends!',
      images: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop'],
    },
    other: {
      'og:type': 'website',
      'og:site_name': 'Hangouts 3.0',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/jpeg',
      'og:image:secure_url': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
      'og:updated_time': new Date().toISOString(),
      'og:locale': 'en_US',
    },
  }
}

export default function PublicEventPage({ params }: Props) {
  return <PublicEventViewer params={params} />
}