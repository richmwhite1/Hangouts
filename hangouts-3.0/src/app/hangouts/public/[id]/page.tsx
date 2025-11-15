import { Metadata } from 'next'
import { PublicHangoutViewer } from './public-hangout-viewer'
import { logger } from '@/lib/logger'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    // Fetch hangout data for metadata
    // Use internal API call instead of external URL to avoid CORS issues
    // For production, use the actual production URL for absolute image URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://hangouts-production-adc4.up.railway.app'
      : 'http://localhost:3000')
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? `${baseUrl}/api/hangouts/public/${id}`
      : `http://localhost:3000/api/hangouts/public/${id}`
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return {
        title: 'Hangout - Plans',
        description: 'Join this hangout and connect with friends!',
        openGraph: {
          title: 'Hangout - Plans',
          description: 'Join this hangout and connect with friends!',
          type: 'website',
          siteName: 'Plans',
          images: [{
            url: `${baseUrl}/placeholder-hangout.jpg`,
            width: 1200,
            height: 630,
            alt: 'Hangout',
          }],
        },
      }
    }
    
    const data = await response.json()
    const hangout = data.hangout
    
    if (!hangout) {
      return {
        title: 'Hangout - Plans',
        description: 'Join this hangout and connect with friends!',
        openGraph: {
          title: 'Hangout - Plans',
          description: 'Join this hangout and connect with friends!',
          type: 'website',
          siteName: 'Plans',
          images: [{
            url: `${baseUrl}/placeholder-hangout.jpg`,
            width: 1200,
            height: 630,
            alt: 'Hangout',
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
    
    // Create inviting title and description for link previews
    const title = `${hangout.title} - Plans`
    const invitationText = `Hey, are you interested in ${hangout.title}?`
    const description = hangout.description 
      ? `${invitationText}\n\n${hangout.description}\n\nWhen: ${formatDate(hangout.startTime)}${hangout.startTime ? ` at ${formatTime(hangout.startTime)}` : ''}\nWhere: ${hangout.location || 'TBD'}\nCreated by: ${hangout.creator?.name || 'Someone'}`
      : `${invitationText}\n\nWhen: ${formatDate(hangout.startTime)}${hangout.startTime ? ` at ${formatTime(hangout.startTime)}` : ''}\nWhere: ${hangout.location || 'TBD'}\nCreated by: ${hangout.creator?.name || 'Someone'}`
    
    const shareUrl = `${baseUrl}/hangouts/public/${id}`
    
    // Use the actual hangout image if available, otherwise fallback to generic
    // Ensure image URL is absolute for Open Graph previews
    let hangoutImage = hangout.image || `${baseUrl}/placeholder-hangout.jpg`
    // Convert relative URLs to absolute URLs
    if (hangoutImage && hangoutImage.startsWith('/')) {
      hangoutImage = `${baseUrl}${hangoutImage}`
    }
    // Ensure it's a full URL (not just a path)
    if (hangoutImage && !hangoutImage.startsWith('http')) {
      hangoutImage = `${baseUrl}${hangoutImage.startsWith('/') ? '' : '/'}${hangoutImage}`
    }
    
    return {
      title,
      description,
      openGraph: {
        title: invitationText,
        description,
        url: shareUrl,
        siteName: 'Plans',
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
        title: invitationText,
        description,
        images: [hangoutImage],
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Plans',
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/jpeg',
        'og:image:secure_url': hangoutImage,
        'og:updated_time': new Date().toISOString(),
        'og:locale': 'en_US',
        'article:author': hangout.creator?.name || 'Plans',
        'article:section': 'Hangouts',
        'article:tag': 'Hangout',
      },
    }
  } catch (error) {
    logger.error('Error generating metadata:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://hangouts-production-adc4.up.railway.app'
      : 'http://localhost:3000')
    return {
      title: 'Hangout - Plans',
      description: 'Join this hangout and connect with friends!',
      openGraph: {
        title: 'Hangout - Plans',
        description: 'Join this hangout and connect with friends!',
        type: 'website',
        siteName: 'Plans',
        images: [{
          url: `${baseUrl}/placeholder-hangout.jpg`,
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