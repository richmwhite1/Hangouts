import { Metadata } from 'next'
import { PublicHangoutViewer } from './public-hangout-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  // For now, return basic metadata that will work for iPhone sharing
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return {
    title: `Hangout - Hangouts 3.0`,
    description: 'Join this hangout and connect with friends!',
    openGraph: {
      title: `Hangout - Hangouts 3.0`,
      description: 'Join this hangout and connect with friends!',
      url: `${baseUrl}/hangouts/public/${id}`,
      siteName: 'Hangouts 3.0',
      type: 'website',
      images: [{
        url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=630&fit=crop',
        width: 1200,
        height: 630,
        alt: 'Hangout',
      }],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hangout - Hangouts 3.0`,
      description: 'Join this hangout and connect with friends!',
      images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=630&fit=crop'],
    },
    other: {
      'og:type': 'website',
      'og:site_name': 'Hangouts 3.0',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/jpeg',
      'og:image:secure_url': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=630&fit=crop',
      'og:updated_time': new Date().toISOString(),
      'og:locale': 'en_US',
    },
  }
}

export default function PublicHangoutPage({ params }: Props) {
  return <PublicHangoutViewer params={params} />
}