import { Metadata } from 'next'

interface EventData {
  id: string
  title: string
  description: string
  category: string
  venue: string
  address: string
  city: string
  startDate: string
  startTime: string
  coverImage: string
  price: {
    min: number
    max?: number
    currency: string
  }
  tags: string[]
  attendeeCount: number
  isPublic: boolean
  creator: {
    id: string
    name: string
    username: string
    avatar: string
  }
  createdAt: string
}

export async function generateEventMetadata(event: EventData, isPublic: boolean = false): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
  const eventUrl = `${baseUrl}/event/${event.id}`
  const imageUrl = event.coverImage || `${baseUrl}/api/placeholder/1200/630`
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: { min: number; max?: number; currency: string }) => {
    if (price.min === 0) return 'Free'
    if (price.max && price.max !== price.min) {
      return `${price.currency}${price.min} - ${price.currency}${price.max}`
    }
    return `${price.currency}${price.min}`
  }

  const title = `${event.title}${event.venue ? ` at ${event.venue}` : ''}`
  const description = 
    `Join us for this ${event.category?.toLowerCase() || 'event'}${event.startDate ? ` on ${formatDate(event.startDate)}` : ''}${event.venue ? ` at ${event.venue}` : ''}. ${formatPrice(event.price)}${isPublic ? ' - Open to everyone!' : ' - Sign in to join this event.'}`

  return {
    title,
    description,
    keywords: `event, ${event.category?.toLowerCase()}, ${event.tags?.join(', ')}, social, meetup, friends, planning`,
    authors: [{ name: event.creator?.name || 'Hangouts 3.0' }],
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      title,
      description,
      url: eventUrl,
      siteName: 'Hangouts 3.0',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
      ...(event.startDate && {
        'event:start_time': new Date(event.startDate).toISOString(),
      }),
      ...(event.venue && {
        'event:location': `${event.venue}${event.city ? `, ${event.city}` : ''}`,
      }),
      'event:category': event.category,
      'event:price': formatPrice(event.price),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: eventUrl,
    },
  }
}
