import { Metadata } from 'next'
import { PublicEventViewer } from './public-event-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch event data for metadata
    // Use internal API call instead of external URL to avoid CORS issues
    // For production, use the actual production URL for absolute image URLs
    // IMPORTANT: NEXT_PUBLIC_APP_URL must be set in Railway environment variables
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://hangouts-production-adc4.up.railway.app'
      : 'http://localhost:3000')
    
    // Use localhost for API calls in all environments (server-side fetch)
    // This avoids CORS and ensures we can fetch data during metadata generation
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? `http://localhost:${process.env.PORT || 8080}/api/events/public/${id}`
      : `http://localhost:3000/api/events/public/${id}`
    
    console.log('Metadata generation - Fetching event', { 
      id, 
      baseUrl, 
      apiUrl,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      nodeEnv: process.env.NODE_ENV 
    })
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return {
        title: 'Event - Plans',
        description: 'Join this event and connect with friends!',
        openGraph: {
          title: 'Event - Plans',
          description: 'Join this event and connect with friends!',
          type: 'website',
          siteName: 'Plans',
          images: [{
            url: `${baseUrl}/placeholder-event.jpg`,
            width: 1200,
            height: 630,
            alt: 'Event',
          }],
        },
      }
    }
    
    const data = await response.json()
    const event = data.event
    
    if (!event) {
      return {
        title: 'Event - Plans',
        description: 'Join this event and connect with friends!',
        openGraph: {
          title: 'Event - Plans',
          description: 'Join this event and connect with friends!',
          type: 'website',
          siteName: 'Plans',
          images: [{
            url: `${baseUrl}/placeholder-event.jpg`,
            width: 1200,
            height: 630,
            alt: 'Event',
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
    
    // Create inviting title and description for link previews
    // Keep description concise for Open Graph (max 200 chars recommended)
    const title = `${event.title} - Plans`
    const invitationText = `Hey, are you interested in ${event.title}?`
    
    // Build description without newlines (Open Graph doesn't support them well)
    const dateTime = event.startTime 
      ? `${formatDate(event.startTime)}${event.startTime ? ` at ${formatTime(event.startTime)}` : ''}`
      : 'TBD'
    const venue = event.venue || 'TBD'
    const city = event.city ? `, ${event.city}` : ''
    const price = formatPrice(event.priceMin)
    const creator = event.creator?.name || 'Someone'
    
    // Create a clean description (remove newlines, limit length)
    let description = event.description 
      ? `${invitationText} ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''} When: ${dateTime}. Where: ${venue}${city}. Price: ${price}.`
      : `${invitationText} When: ${dateTime}. Where: ${venue}${city}. Price: ${price}. Created by: ${creator}.`
    
    // Ensure description is not too long (Open Graph recommends max 200 chars)
    if (description.length > 200) {
      description = description.substring(0, 197) + '...'
    }
    
    const shareUrl = `${baseUrl}/events/public/${id}`
    
    // Use the actual event image if available, otherwise fallback to generic
    // Ensure image URL is absolute for Open Graph previews
    let eventImage = event.image || `${baseUrl}/placeholder-event.jpg`
    // Convert relative URLs to absolute URLs
    if (eventImage && eventImage.startsWith('/')) {
      eventImage = `${baseUrl}${eventImage}`
    }
    // Ensure it's a full URL (not just a path)
    if (eventImage && !eventImage.startsWith('http')) {
      eventImage = `${baseUrl}${eventImage.startsWith('/') ? '' : '/'}${eventImage}`
    }
    
    console.log('Metadata generation - Generated metadata', { 
      id,
      title: event.title,
      imageUrl: eventImage,
      baseUrl,
      shareUrl: `${baseUrl}/events/public/${id}`
    })
    
    return {
      title,
      description,
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: shareUrl,
      },
      openGraph: {
        title: invitationText,
        description,
        url: shareUrl,
        siteName: 'Plans',
        type: 'website',
        locale: 'en_US',
        images: [
          {
            url: eventImage,
            width: 1200,
            height: 630,
            alt: event.title,
            type: 'image/jpeg',
            secureUrl: eventImage,
          }
        ],
        ...(event.startTime && {
          publishedTime: new Date(event.startTime).toISOString(),
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: invitationText,
        description,
        images: [eventImage],
        creator: event.creator?.name || '@Plans',
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Plans',
        'og:image': eventImage,
        'og:image:url': eventImage,
        'og:image:secure_url': eventImage,
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/jpeg',
        'og:image:alt': event.title,
        'og:updated_time': new Date().toISOString(),
        'og:locale': 'en_US',
        'og:locale:alternate': 'en_US',
        ...(event.startTime && {
          'event:start_time': new Date(event.startTime).toISOString(),
        }),
        ...(event.endTime && {
          'event:end_time': new Date(event.endTime).toISOString(),
        }),
        ...(event.venue && {
          'event:location': `${event.venue}${event.city ? `, ${event.city}` : ''}`,
        }),
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://hangouts-production-adc4.up.railway.app'
      : 'http://localhost:3000')
    return {
      title: 'Event - Plans',
      description: 'Join this event and connect with friends!',
      openGraph: {
        title: 'Event - Plans',
        description: 'Join this event and connect with friends!',
        type: 'website',
        siteName: 'Plans',
        images: [{
          url: `${baseUrl}/placeholder-event.jpg`,
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
