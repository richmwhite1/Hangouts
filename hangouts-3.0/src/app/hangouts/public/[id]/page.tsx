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

    const formatDate = (dateString?: string | null) => {
      if (!dateString) return 'TBD'
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'TBD'
        return date.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      } catch {
        return 'TBD'
      }
    }
    
    const formatTime = (dateString?: string | null) => {
      if (!dateString) return 'TBD'
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'TBD'
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      } catch {
        return 'TBD'
      }
    }
    
    // Create title and description for link previews
    // Use the hangout title directly for better preview display
    const title = hangout.title
    const invitationText = `Hey, are you interested in ${hangout.title}?`
    
    // Build description prioritizing the hangout description
    // Open Graph description should be concise (max 200 chars recommended, but can go up to 300)
    const dateTime = hangout.startTime 
      ? `${formatDate(hangout.startTime)}${hangout.startTime ? ` at ${formatTime(hangout.startTime)}` : ''}`
      : 'TBD'
    const location = hangout.location || 'TBD'
    const creator = hangout.creator?.name || 'Someone'
    
    // Create description: prioritize hangout description, then add context
    // Remove newlines and clean up whitespace for better display
    let description = ''
    if (hangout.description && hangout.description.trim().length > 0) {
      // Clean description: remove newlines, extra spaces
      const cleanDesc = hangout.description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
      // Use description first, then add context if there's room
      const maxDescLength = 180 // Leave room for context
      if (cleanDesc.length <= maxDescLength) {
        description = `${cleanDesc} When: ${dateTime}. Where: ${location}.`
      } else {
        description = `${cleanDesc.substring(0, maxDescLength - 3)}... When: ${dateTime}. Where: ${location}.`
      }
    } else {
      // No description, create one with available info
      description = `${invitationText} When: ${dateTime}. Where: ${location}. Created by: ${creator}.`
    }
    
    // Ensure description is not too long (Open Graph recommends max 200-300 chars)
    // Some platforms support up to 300 chars, but 200 is safer
    if (description.length > 300) {
      description = description.substring(0, 297) + '...'
    }
    
    const shareUrl = `${baseUrl}/hangouts/public/${id}`
    
    // Use the actual hangout image if available, otherwise generate OG image
    // Ensure image URL is absolute for Open Graph previews (required for iPhone Messages)
    // iPhone Messages requires absolute HTTPS URLs and cannot handle data URLs
    let hangoutImage: string
    const rawImage = hangout.image
    
    // Helper function to ensure absolute HTTPS URL
    // iPhone Messages requires absolute HTTPS URLs for preview images
    const ensureAbsoluteHttpsUrl = (url: string): string => {
      if (!url || url.trim().length === 0) return ''
      
      // Reject data URLs (not supported by iPhone Messages)
      if (url.startsWith('data:')) return ''
      
      // If already absolute HTTPS, return as-is
      if (url.startsWith('https://')) return url
      
      // Convert HTTP to HTTPS (required for iPhone Messages)
      if (url.startsWith('http://')) {
        return url.replace('http://', 'https://')
      }
      
      // If relative URL (starts with /), make it absolute
      if (url.startsWith('/')) {
        // Remove leading slash if baseUrl already has trailing slash
        const cleanUrl = url.startsWith('//') ? url.substring(1) : url
        return `${baseUrl}${cleanUrl}`
      }
      
      // If no protocol and doesn't start with /, assume relative and prepend baseUrl
      // Ensure baseUrl doesn't have trailing slash
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
      return `${cleanBaseUrl}/${url}`
    }
    
    // Check if image is valid for preview (not a data URL and not empty)
    const isValidImage = rawImage && 
      !rawImage.startsWith('data:') && 
      rawImage.trim().length > 0
    
    if (isValidImage) {
      hangoutImage = ensureAbsoluteHttpsUrl(rawImage)
      
      // If conversion failed or still not HTTPS, fall back to OG image
      if (!hangoutImage || !hangoutImage.startsWith('https://')) {
        const ogImageParams = new URLSearchParams({
          title: hangout.title,
          creator: hangout.creator?.name || 'Someone',
          date: formatDate(hangout.startTime),
          location: hangout.location || 'TBD',
          participants: String(hangout._count?.participants || 0)
        })
        hangoutImage = `${baseUrl}/api/og/hangout?${ogImageParams.toString()}`
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
    
    // Final validation: ensure it's an absolute HTTPS URL (critical for iPhone Messages)
    if (!hangoutImage || !hangoutImage.startsWith('https://')) {
      // Force use of OG image if validation fails
      const ogImageParams = new URLSearchParams({
        title: hangout.title,
        creator: hangout.creator?.name || 'Someone',
        date: formatDate(hangout.startTime),
        location: hangout.location || 'TBD',
        participants: String(hangout._count?.participants || 0)
      })
      hangoutImage = `${baseUrl}/api/og/hangout?${ogImageParams.toString()}`
    }
    
    // Log for debugging (helps identify issues in production)
    logger.info('OG Image URL validation', {
      originalImage: rawImage,
      finalImage: hangoutImage,
      isHttps: hangoutImage.startsWith('https://'),
      baseUrl
    })
    
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
        title: title, // Use hangout title for better preview display
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
            type: hangout.image ? 'image/jpeg' : 'image/png', // Use correct type based on source
            secureUrl: hangoutImage.startsWith('https') ? hangoutImage : hangoutImage.replace('http://', 'https://'),
          }
        ],
        ...(hangout.startTime && {
          publishedTime: new Date(hangout.startTime).toISOString(),
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: title, // Use hangout title for better preview display
        description,
        images: [hangoutImage],
        creator: hangout.creator?.name || '@Plans',
      },
      other: {
        'og:type': 'website',
        'og:site_name': 'Plans',
        'og:title': title, // Explicitly set OG title
        'og:description': description, // Explicitly set OG description
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
        // Additional iPhone Messages compatibility tags
        'format-detection': 'telephone=no',
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