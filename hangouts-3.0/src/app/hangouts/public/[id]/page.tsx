import { Metadata } from 'next'
import { PublicHangoutViewer } from './public-hangout-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch hangout data for metadata
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangouts-production-adc4.up.railway.app'
    const response = await fetch(`${baseUrl}/api/hangouts/public/${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: 'Hangout Not Found - Hangouts 3.0',
        description: 'This hangout is private or friends-only. Sign in to view it.',
        openGraph: {
          title: 'Hangout Not Found - Hangouts 3.0',
          description: 'This hangout is private or friends-only. Sign in to view it.',
          type: 'website',
          siteName: 'Hangouts 3.0',
          images: [{
            url: '${baseUrl}/placeholder-hangout.jpg',
            width: 1200,
            height: 630,
            alt: 'Hangout Not Found',
          }],
        },
      }
    }
    
    const data = await response.json()
    const hangout = data.hangout
    
    if (!hangout) {
      return {
        title: 'Hangout Not Found - Hangouts 3.0',
        description: 'This hangout is private or friends-only. Sign in to view it.',
        openGraph: {
          title: 'Hangout Not Found - Hangouts 3.0',
          description: 'This hangout is private or friends-only. Sign in to view it.',
          type: 'website',
          siteName: 'Hangouts 3.0',
          images: [{
            url: '${baseUrl}/placeholder-hangout.jpg',
            width: 1200,
            height: 630,
            alt: 'Hangout Not Found',
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
    
    const title = `${hangout.title} - Hangouts 3.0`
    const description = hangout.description 
      ? `${hangout.description}\n\nWhen: ${formatDate(hangout.startTime)}${hangout.startTime ? ` at ${formatTime(hangout.startTime)}` : ''}\nWhere: ${hangout.location || 'TBD'}\nCreated by: ${hangout.creator?.name || 'Someone'}`
      : `Join us for ${hangout.title}!\n\nWhen: ${formatDate(hangout.startTime)}${hangout.startTime ? ` at ${formatTime(hangout.startTime)}` : ''}\nWhere: ${hangout.location || 'TBD'}\nCreated by: ${hangout.creator?.name || 'Someone'}`
    
    const shareUrl = `${baseUrl}/hangouts/public/${id}`
    
    // Use the actual hangout image if available, otherwise fallback to generic
    const hangoutImage = hangout.image || `${baseUrl}/placeholder-hangout.jpg`
    
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
          url: hangoutImage,
          width: 1200,
          height: 630,
          alt: hangout.title,
        }],
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [hangoutImage],
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Hangouts 3.0',
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/jpeg',
        'og:image:secure_url': hangoutImage,
        'og:updated_time': new Date().toISOString(),
        'og:locale': 'en_US',
        'article:author': hangout.creator?.name || 'Hangouts 3.0',
        'article:section': 'Hangouts',
        'article:tag': 'Hangout',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Hangout - Hangouts 3.0',
      description: 'Join this hangout and connect with friends!',
      openGraph: {
        title: 'Hangout - Hangouts 3.0',
        description: 'Join this hangout and connect with friends!',
        type: 'website',
        siteName: 'Hangouts 3.0',
        images: [{
          url: '${baseUrl}/placeholder-hangout.jpg',
          width: 1200,
          height: 630,
          alt: 'Hangout',
        }],
      },
    }
  }
}

export default function PublicHangoutPage({ params }: Props) {
  return <PublicHangoutViewer params={params} />
}