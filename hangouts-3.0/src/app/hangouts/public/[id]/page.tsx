import { Metadata } from 'next'
import { PublicHangoutViewer } from './public-hangout-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch hangout data for metadata
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hangouts/public/${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: 'Hangout Not Found - Hangouts 3.0',
        description: 'This hangout is private or friends-only. Sign in to view it.',
      }
    }
    
    const data = await response.json()
    const hangout = data.hangout
    
    if (!hangout) {
      return {
        title: 'Hangout Not Found - Hangouts 3.0',
        description: 'This hangout is private or friends-only. Sign in to view it.',
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
    
    const title = `${hangout.title} - Hangouts 3.0`
    const description = hangout.description 
      ? `${hangout.description}\n\nWhen: ${formatDate(hangout.startTime)}\nWhere: ${hangout.location || 'TBD'}\nCreated by: ${hangout.creator?.name || 'Someone'}`
      : `Join us for ${hangout.title}!\n\nWhen: ${formatDate(hangout.startTime)}\nWhere: ${hangout.location || 'TBD'}\nCreated by: ${hangout.creator?.name || 'Someone'}`
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://hangouts-production-adc4.up.railway.app' : 'http://localhost:3000')
    const shareUrl = `${baseUrl}/hangouts/public/${id}`
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName: 'Hangouts 3.0',
        images: [
          ...(hangout.image ? [{
            url: hangout.image,
            width: 1200,
            height: 630,
            alt: hangout.title,
          }] : [{
            url: `${baseUrl}/placeholder-hangout-og.svg`,
            width: 1200,
            height: 630,
            alt: hangout.title,
          }])
        ],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [
          ...(hangout.image ? [hangout.image] : [`${baseUrl}/placeholder-hangout-og.svg`])
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
      title: 'Hangout - Hangouts 3.0',
      description: 'Join this hangout and connect with friends!',
    }
  }
}

export default function PublicHangoutPage({ params }: Props) {
  return <PublicHangoutViewer params={params} />
}