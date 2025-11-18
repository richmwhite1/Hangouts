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
    // IMPORTANT: NEXT_PUBLIC_APP_URL must be set in Railway environment variables
    // Force HTTPS for iPhone Messages compatibility
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://hangouts-production-adc4.up.railway.app'
      : 'http://localhost:3000')
    
    // Ensure baseUrl is HTTPS (required for iPhone Messages previews)
    if (baseUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
      baseUrl = baseUrl.replace('http://', 'https://')
    }
    
    // Use localhost for API calls in all environments (server-side fetch)
    // This avoids CORS and ensures we can fetch data during metadata generation
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? `http://localhost:${process.env.PORT || 8080}/api/hangouts/public/${id}`
      : `http://localhost:3000/api/hangouts/public/${id}`
    
    logger.info('Metadata generation - Fetching hangout', { 
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
    // Keep description concise for Open Graph (max 200 chars recommended)
    const title = `${hangout.title} - Plans`
    const invitationText = `Hey, are you interested in ${hangout.title}?`
    
    // Build description without newlines (Open Graph doesn't support them well)
    const dateTime = hangout.startTime 
      ? `${formatDate(hangout.startTime)}${hangout.startTime ? ` at ${formatTime(hangout.startTime)}` : ''}`
      : 'TBD'
    const location = hangout.location || 'TBD'
    const creator = hangout.creator?.name || 'Someone'
    
    // Create a clean description (remove newlines, limit length)
    let description = hangout.description 
      ? `${invitationText} ${hangout.description.substring(0, 100)}${hangout.description.length > 100 ? '...' : ''} When: ${dateTime}. Where: ${location}.`
      : `${invitationText} When: ${dateTime}. Where: ${location}. Created by: ${creator}.`
    
    // Ensure description is not too long (Open Graph recommends max 200 chars)
    if (description.length > 200) {
      description = description.substring(0, 197) + '...'
    }
    
    const shareUrl = `${baseUrl}/hangouts/public/${id}`
    
    // Use the actual hangout image if available, otherwise generate OG image
    // Ensure image URL is absolute for Open Graph previews (required for iPhone Messages)
    // iPhone Messages requires absolute HTTPS URLs and cannot handle data URLs
    let hangoutImage: string
    const rawImage = hangout.image
    
    // Check if image is valid for preview (not a data URL and not empty)
    const isValidImage = rawImage && 
      !rawImage.startsWith('data:') && 
      rawImage.trim().length > 0
    
    if (isValidImage) {
      hangoutImage = rawImage
      // Convert relative URLs to absolute URLs
      if (hangoutImage.startsWith('/')) {
        hangoutImage = `${baseUrl}${hangoutImage}`
      }
      // Ensure it's a full HTTPS URL (not just a path or HTTP)
      if (!hangoutImage.startsWith('http')) {
        hangoutImage = `${baseUrl}${hangoutImage.startsWith('/') ? '' : '/'}${hangoutImage}`
      }
      // Force HTTPS for iPhone Messages compatibility
      if (hangoutImage.startsWith('http://')) {
        hangoutImage = hangoutImage.replace('http://', 'https://')
      }
    } else {
      // Generate OG image as fallback - always works and is reliable
      const ogImageParams = new URLSearchParams({
        title: hangout.title,
        creator: hangout.creator?.name || 'Someone',
        date: formatDate(hangout.startTime),
        location: hangout.location || 'TBD',
        participants: String(hangout._count?.participants || 0)
      })
      hangoutImage = `${baseUrl}/api/og/hangout?${ogImageParams.toString()}`
    }
    
    // Final validation: ensure it's an absolute HTTPS URL
    if (!hangoutImage.startsWith('https://')) {
      // If somehow we still don't have HTTPS, use OG image
      const ogImageParams = new URLSearchParams({
        title: hangout.title,
        creator: hangout.creator?.name || 'Someone',
        date: formatDate(hangout.startTime),
        location: hangout.location || 'TBD',
        participants: String(hangout._count?.participants || 0)
      })
      hangoutImage = `${baseUrl}/api/og/hangout?${ogImageParams.toString()}`
    }
    
    logger.info('Metadata generation - Generated metadata', { 
      id,
      title: hangout.title,
      imageUrl: hangoutImage,
      baseUrl,
      shareUrl: `${baseUrl}/hangouts/public/${id}`
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
            url: hangoutImage,
            width: 1200,
            height: 630,
            alt: hangout.title,
            type: 'image/png', // OG images are PNG
            secureUrl: hangoutImage.startsWith('https') ? hangoutImage : hangoutImage.replace('http://', 'https://'),
          }
        ],
        ...(hangout.startTime && {
          publishedTime: new Date(hangout.startTime).toISOString(),
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: invitationText,
        description,
        images: [hangoutImage],
        creator: hangout.creator?.name || '@Plans',
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Plans',
        'og:image': hangoutImage,
        'og:image:url': hangoutImage,
        'og:image:secure_url': hangoutImage.startsWith('https') ? hangoutImage : hangoutImage.replace('http://', 'https://'),
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': hangout.image ? 'image/jpeg' : 'image/png',
        'og:image:alt': hangout.title,
        'og:updated_time': new Date().toISOString(),
        'og:locale': 'en_US',
        'og:locale:alternate': 'en_US',
        // iOS Messages specific tags
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
        ...(hangout.startTime && {
          'event:start_time': new Date(hangout.startTime).toISOString(),
        }),
        ...(hangout.endTime && {
          'event:end_time': new Date(hangout.endTime).toISOString(),
        }),
        ...(hangout.location && {
          'event:location': hangout.location,
        }),
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