import { Metadata } from 'next'
import { PublicEventViewer } from './public-event-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch event data for metadata
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/events/public/${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: 'Event Not Found - Hangouts 3.0',
        description: 'This event is private or friends-only. Sign in to view it.',
      }
    }
    
    const data = await response.json()
    const event = data.event
    
    if (!event) {
      return {
        title: 'Event Not Found - Hangouts 3.0',
        description: 'This event is private or friends-only. Sign in to view it.',
      }
    }
    
    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    
    const formatTime = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      })
    }
    
    const formatPrice = (price?: number) => {
      if (!price) return 'Free'
      return `$${price}`
    }
    
    const title = `${event.title} - Hangouts 3.0`
    const description = event.description 
      ? `${event.description}\n\nWhen: ${formatDate(event.startDate)}${event.startDate ? ` at ${formatTime(event.startDate)}` : ''}\nWhere: ${event.venue || 'TBD'}${event.city ? `, ${event.city}` : ''}\nPrice: ${formatPrice(event.price)}\nCreated by: ${event.creator?.name || 'Someone'}`
      : `Join us for ${event.title}!\n\nWhen: ${formatDate(event.startDate)}${event.startDate ? ` at ${formatTime(event.startDate)}` : ''}\nWhere: ${event.venue || 'TBD'}${event.city ? `, ${event.city}` : ''}\nPrice: ${formatPrice(event.price)}\nCreated by: ${event.creator?.name || 'Someone'}`
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
    const shareUrl = `${baseUrl}/events/public/${id}`
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName: 'Hangouts 3.0',
        images: [
          {
            url: `${baseUrl}/api/og/event?${new URLSearchParams({
              title: event.title,
              creator: event.creator?.name || 'Someone',
              date: formatDate(event.startDate),
              venue: event.venue || 'TBD',
              city: event.city || '',
              price: formatPrice(event.price),
              participants: event._count?.participants?.toString() || '0'
            })}`,
            width: 1200,
            height: 630,
            alt: event.title,
          },
          ...(event.image ? [{
            url: event.image,
            width: 1200,
            height: 630,
            alt: event.title,
          }] : [])
        ],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [
          `${baseUrl}/api/og/event?${new URLSearchParams({
            title: event.title,
            creator: event.creator?.name || 'Someone',
            date: formatDate(event.startDate),
            venue: event.venue || 'TBD',
            city: event.city || '',
            price: formatPrice(event.price),
            participants: event._count?.participants?.toString() || '0'
          })}`,
          ...(event.image ? [event.image] : [])
        ],
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Hangouts 3.0',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Event - Hangouts 3.0',
      description: 'Join this event and connect with friends!',
    }
  }
}

export default function PublicEventPage({ params }: Props) {
  return <PublicEventViewer params={params} />
}
