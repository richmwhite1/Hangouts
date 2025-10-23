import { Metadata } from 'next'

interface HangoutData {
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
    avatar?: string
  }
  participants?: Array<{
    id: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
  }>
  _count?: { participants: number }
}

export async function generateHangoutMetadata(hangout: HangoutData, isPublic: boolean = true): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
  const hangoutUrl = `${baseUrl}/hangouts/public/${hangout.id}`
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

  const title = `Come check out ${hangout.title} hangout${hangout.location ? ` at ${hangout.location}` : ''}`
  const description = hangout.description || 
    `Join ${hangout.creator?.name || 'us'} for this hangout${hangout.startTime ? ` on ${formatDate(hangout.startTime)}` : ''}. ${isPublic ? 'Open to everyone!' : 'Sign in to join this hangout.'}`

  return {
    title,
    description,
    keywords: 'hangout, event, social, meetup, friends, planning, public',
    authors: [{ name: hangout.creator?.name || 'Hangouts 3.0' }],
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      title,
      description,
      url: hangoutUrl,
      siteName: 'Hangouts 3.0',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: hangout.title,
        },
      ],
      ...(hangout.startTime && {
        'event:start_time': new Date(hangout.startTime).toISOString(),
      }),
      ...(hangout.endTime && {
        'event:end_time': new Date(hangout.endTime).toISOString(),
      }),
      ...(hangout.location && {
        'event:location': hangout.location,
      }),
      'hangout:privacy': hangout.privacyLevel,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: hangoutUrl,
    },
  }
}








