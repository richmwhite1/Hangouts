import { Metadata } from 'next'
import { PublicEventViewer } from './public-event-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch event data for metadata
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/events/public/${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: 'Event Not Found - Hangouts 3.0',
        description: 'This event is private or friends-only. Sign in to view it.',
        openGraph: {
          title: 'Event Not Found - Hangouts 3.0',
          description: 'This event is private or friends-only. Sign in to view it.',
          type: 'website',
          siteName: 'Hangouts 3.0',
          images: [{
            url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
            width: 1200,
            height: 630,
            alt: 'Event Not Found',
          }],
        },
      }
    }
    
    const data = await response.json()
    const event = data.event
    
    if (!event) {
      return {
        title: 'Event Not Found - Hangouts 3.0',
        description: 'This event is private or friends-only. Sign in to view it.',
        openGraph: {
          title: 'Event Not Found - Hangouts 3.0',
          description: 'This event is private or friends-only. Sign in to view it.',
          type: 'website',
          siteName: 'Hangouts 3.0',
          images: [{
            url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
            width: 1200,
            height: 630,
            alt: 'Event Not Found',
          }],
        },
      }
    }

    const formatDate = (dateString: string) => {
      if (!dateString) return 'TBD'
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'TBD'
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    const formatTime = (dateString: string) => {
      if (!dateString) return 'TBD'
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'TBD'
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    const formatPrice = (price?: number) => {
      if (!price || price === 0) return 'Free'
      return `$${price}`
    }
    
    const title = `${event.title} - Hangouts 3.0`
    const description = event.description 
      ? `${event.description}\n\nWhen: ${formatDate(event.startTime)}${event.startTime ? ` at ${formatTime(event.startTime)}` : ''}\nWhere: ${event.venue || 'TBD'}${event.city ? `, ${event.city}` : ''}\nPrice: ${formatPrice(event.priceMin)}\nCreated by: ${event.creator?.name || 'Someone'}`
      : `Join us for ${event.title}!\n\nWhen: ${formatDate(event.startTime)}${event.startTime ? ` at ${formatTime(event.startTime)}` : ''}\nWhere: ${event.venue || 'TBD'}${event.city ? `, ${event.city}` : ''}\nPrice: ${formatPrice(event.priceMin)}\nCreated by: ${event.creator?.name || 'Someone'}`
    
    const shareUrl = `${baseUrl}/events/public/${id}`
    
    // Use the actual event image if available, otherwise fallback to generic
    const eventImage = event.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop'
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName: 'Hangouts 3.0',
        type: 'website',
        images: [{
          url: eventImage,
          width: 1200,
          height: 630,
          alt: event.title,
        }],
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [eventImage],
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Hangouts 3.0',
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/jpeg',
        'og:image:secure_url': eventImage,
        'og:updated_time': new Date().toISOString(),
        'og:locale': 'en_US',
        'article:author': event.creator?.name || 'Hangouts 3.0',
        'article:section': 'Events',
        'article:tag': 'Event',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Event - Hangouts 3.0',
      description: 'Join this event and connect with friends!',
      openGraph: {
        title: 'Event - Hangouts 3.0',
        description: 'Join this event and connect with friends!',
        type: 'website',
        siteName: 'Hangouts 3.0',
        images: [{
          url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
          width: 1200,
          height: 630,
          alt: 'Event',
        }],
      },
    }
  }
}

export default function PublicEventPage({ params }: Props) {
  return <PublicEventViewer params={params} />
}// Force rebuild Tue Oct 21 19:19:58 MDT 2025
