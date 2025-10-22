import { Metadata } from 'next'

interface HangoutData {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  creator: {
    name: string
    username: string
    avatar?: string
  }
  image?: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  _count: { participants: number }
}

export async function generateHangoutMetadata(
  hangoutId: string,
  hangoutData?: HangoutData
): Promise<Metadata> {
  if (!hangoutData) {
    return {
      title: 'Hangout Details',
      description: 'Join this hangout and connect with friends!',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
  const shareUrl = `${baseUrl}/hangouts/public/${hangoutId}`
  
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

  const title = `${hangoutData.title} - Hangouts 3.0`
  const description = hangoutData.description 
    ? `${hangoutData.description}\n\nWhen: ${formatDate(hangoutData.startTime)} at ${formatTime(hangoutData.startTime)}\nWhere: ${hangoutData.location || 'TBD'}\nCreated by: ${hangoutData.creator.name}`
    : `Join us for ${hangoutData.title}!\n\nWhen: ${formatDate(hangoutData.startTime)} at ${formatTime(hangoutData.startTime)}\nWhere: ${hangoutData.location || 'TBD'}\nCreated by: ${hangoutData.creator.name}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: 'Hangouts 3.0',
      images: hangoutData.image ? [
        {
          url: hangoutData.image,
          width: 1200,
          height: 630,
          alt: hangoutData.title,
        }
      ] : [
        {
          url: `${baseUrl}/api/og/hangout?title=${encodeURIComponent(hangoutData.title)}&creator=${encodeURIComponent(hangoutData.creator.name)}&date=${encodeURIComponent(formatDate(hangoutData.startTime))}`,
          width: 1200,
          height: 630,
          alt: hangoutData.title,
        }
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: hangoutData.image ? [hangoutData.image] : [`${baseUrl}/api/og/hangout?title=${encodeURIComponent(hangoutData.title)}&creator=${encodeURIComponent(hangoutData.creator.name)}&date=${encodeURIComponent(formatDate(hangoutData.startTime))}`],
    },
    other: {
      'og:type': 'website',
      'og:site_name': 'Hangouts 3.0',
    },
  }
}







