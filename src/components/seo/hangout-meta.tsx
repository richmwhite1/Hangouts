'use client'

import Head from 'next/head'

interface HangoutMetaProps {
  hangout: {
    id: string
    title: string
    description?: string
    image?: string
    location?: string
    startTime: string
    endTime: string
    privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
    creator: {
      name: string
      username: string
    }
  }
  baseUrl?: string
}

export function HangoutMeta({ hangout, baseUrl }: HangoutMetaProps) {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const hangoutUrl = `${url}/hangout/${hangout.id}`
  const imageUrl = hangout.image || `${url}/og-hangout-default.jpg`
  
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

  const eventDate = formatDate(hangout.startTime)
  const eventTime = `${formatTime(hangout.startTime)} - ${formatTime(hangout.endTime)}`
  
  const description = hangout.description || 
    `Join ${hangout.creator.name} for ${hangout.title} on ${eventDate} at ${eventTime}${hangout.location ? ` in ${hangout.location}` : ''}.`

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{hangout.title} | Hangouts 3.0</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="hangout, event, social, friends, meetup, planning" />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={hangout.title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={hangoutUrl} />
      <meta property="og:site_name" content="Hangouts 3.0" />
      <meta property="og:locale" content="en_US" />
      
      {/* Event-specific Open Graph tags */}
      <meta property="event:start_time" content={hangout.startTime} />
      <meta property="event:end_time" content={hangout.endTime} />
      <meta property="event:location" content={hangout.location || ''} />
      <meta property="event:creator" content={hangout.creator.name} />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={hangout.title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:url" content={hangoutUrl} />
      <meta name="twitter:site" content="@hangouts3" />
      <meta name="twitter:creator" content={`@${hangout.creator.username}`} />
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={hangout.creator.name} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={hangoutUrl} />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      
      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            "name": hangout.title,
            "description": description,
            "startDate": hangout.startTime,
            "endDate": hangout.endTime,
            "location": hangout.location ? {
              "@type": "Place",
              "name": hangout.location
            } : undefined,
            "organizer": {
              "@type": "Person",
              "name": hangout.creator.name,
              "url": `${url}/profile/${hangout.creator.username}`
            },
            "url": hangoutUrl,
            "image": imageUrl,
            "eventStatus": "EventScheduled",
            "eventAttendanceMode": "OfflineEventAttendanceMode"
          })
        }}
      />
    </Head>
  )
}
