import Head from 'next/head'

interface EventMetaProps {
  event: {
    id: string
    title: string
    description?: string
    coverImage?: string
    venue?: string
    city?: string
    startDate?: string
    startTime?: string
    price?: { min: number; max?: number; currency: string }
    category?: string
    tags?: string[]
    createdBy?: {
      name: string
      username: string
    }
  }
  isPublic?: boolean
}

export function EventMeta({ event, isPublic = false }: EventMetaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
  const eventUrl = `${baseUrl}/event/${event.id}`
  const imageUrl = event.coverImage || `${baseUrl}/api/placeholder/1200/630`
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price?: { min: number; max?: number; currency: string }) => {
    if (!price) return ''
    if (price.min === 0) return 'Free'
    if (price.max && price.max !== price.min) {
      return `$${price.min} - $${price.max}`
    }
    return `$${price.min}`
  }

  const title = `${event.title}${event.venue ? ` at ${event.venue}` : ''}`
  const description = event.description || 
    `Join us for this ${event.category?.toLowerCase() || 'event'}${event.startDate ? ` on ${formatDate(event.startDate)}` : ''}${event.venue ? ` at ${event.venue}` : ''}. ${formatPrice(event.price)}${isPublic ? ' - Open to everyone!' : ' - Sign in to join this event.'}`

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={`event, ${event.category?.toLowerCase()}, ${event.tags?.join(', ')}, social, meetup, friends, planning`} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={eventUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={event.title} />
      <meta property="og:site_name" content="Hangouts 3.0" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={event.title} />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={event.createdBy?.name || 'Hangouts 3.0'} />
      
      {/* Event Specific Meta Tags */}
      {event.startDate && (
        <meta property="event:start_time" content={new Date(event.startDate).toISOString()} />
      )}
      {event.venue && (
        <meta property="event:location" content={`${event.venue}${event.city ? `, ${event.city}` : ''}`} />
      )}
      
      {/* Event Details */}
      {event.category && (
        <meta property="event:category" content={event.category} />
      )}
      {event.price && (
        <meta property="event:price" content={formatPrice(event.price)} />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={eventUrl} />
    </Head>
  )
}


