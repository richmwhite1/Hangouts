import Head from 'next/head'

interface HangoutMetaProps {
  hangout: {
    id: string
    title: string
    description?: string
    image?: string
    location?: string
    startTime?: string
    endTime?: string
    privacyLevel: string
    creator?: {
      name: string
      username: string
    }
  }
  isPublic?: boolean
}

export function HangoutMeta({ hangout, isPublic = false }: HangoutMetaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
  const hangoutUrl = `${baseUrl}/hangout/${hangout.id}`
  const imageUrl = hangout.image || `${baseUrl}/api/placeholder/1200/630`
  
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

  const title = `${hangout.title}${hangout.location ? ` at ${hangout.location}` : ''}`
  const description = hangout.description || 
    `Join ${hangout.creator?.name || 'us'} for this hangout${hangout.startTime ? ` on ${formatDate(hangout.startTime)}` : ''}. ${isPublic ? 'Open to everyone!' : 'Sign in to join this hangout.'}`

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="hangout, event, social, meetup, friends, planning" />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={hangoutUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={hangout.title} />
      <meta property="og:site_name" content="Hangouts 3.0" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={hangout.title} />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={hangout.creator?.name || 'Hangouts 3.0'} />
      
      {/* Event Specific Meta Tags */}
      {hangout.startTime && (
        <meta property="event:start_time" content={new Date(hangout.startTime).toISOString()} />
      )}
      {hangout.endTime && (
        <meta property="event:end_time" content={new Date(hangout.endTime).toISOString()} />
      )}
      {hangout.location && (
        <meta property="event:location" content={hangout.location} />
      )}
      
      {/* Privacy Level */}
      <meta property="hangout:privacy" content={hangout.privacyLevel} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={hangoutUrl} />
    </Head>
  )
}