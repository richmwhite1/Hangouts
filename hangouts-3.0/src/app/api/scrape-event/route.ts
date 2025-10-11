import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    let validUrl
    try {
      validUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    console.log('🔍 Scraping URL:', url)

    // Use fetch instead of Puppeteer for better production compatibility
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Simple regex-based extraction (more reliable than complex parsing)
    const scrapedData = {
      title: extractTitle(html),
      description: extractDescription(html),
      venue: extractVenue(html),
      address: '',
      city: '',
      state: '',
      zipCode: '',
      startDate: extractDate(html),
      startTime: extractTime(html),
      endTime: '',
      priceMin: extractPrice(html),
      priceMax: null,
      currency: 'USD',
      coverImage: extractImage(html),
      categories: [],
      tags: []
    }

    console.log('✅ Scraped data:', scrapedData)

    return NextResponse.json({
      success: true,
      data: scrapedData
    })

  } catch (error) {
    console.error('❌ Scraping error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions for extraction
function extractTitle(html: string): string {
  // Try multiple selectors for title
  const titleSelectors = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i
  ]
  
  for (const selector of titleSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      return match[1].trim().substring(0, 200)
    }
  }
  
  return 'Event from URL'
}

function extractDescription(html: string): string {
  const descSelectors = [
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
    /<p[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]+)<\/p>/i
  ]
  
  for (const selector of descSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      return match[1].trim().substring(0, 500)
    }
  }
  
  return ''
}

function extractVenue(html: string): string {
  const venueSelectors = [
    /<meta[^>]*property=["']og:venue["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']event:venue["'][^>]*content=["']([^"']+)["']/i,
    /<span[^>]*class=["'][^"']*venue[^"']*["'][^>]*>([^<]+)<\/span>/i
  ]
  
  for (const selector of venueSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return ''
}

function extractDate(html: string): string {
  const dateSelectors = [
    /<meta[^>]*property=["']event:start_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:start_time["'][^>]*content=["']([^"']+)["']/i,
    /<time[^>]*datetime=["']([^"']+)["']/i
  ]
  
  for (const selector of dateSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      try {
        const date = new Date(match[1])
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      } catch (e) {
        continue
      }
    }
  }
  
  return new Date().toISOString()
}

function extractTime(html: string): string {
  const timeSelectors = [
    /<meta[^>]*property=["']event:start_time["'][^>]*content=["']([^"']+)["']/i,
    /<time[^>]*datetime=["']([^"']+)["']/i
  ]
  
  for (const selector of timeSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      try {
        const date = new Date(match[1])
        if (!isNaN(date.getTime())) {
          return date.toTimeString().substring(0, 5)
        }
      } catch (e) {
        continue
      }
    }
  }
  
  return '19:00'
}

function extractPrice(html: string): number {
  const priceSelectors = [
    /<meta[^>]*property=["']og:price["'][^>]*content=["']([^"']+)["']/i,
    /\$(\d+(?:\.\d{2})?)/i,
    /price[^>]*>.*?\$(\d+(?:\.\d{2})?)/i
  ]
  
  for (const selector of priceSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      const price = parseFloat(match[1])
      if (!isNaN(price)) {
        return price
      }
    }
  }
  
  return 0
}

function extractImage(html: string): string {
  const imageSelectors = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:image:url["'][^>]*content=["']([^"']+)["']/i,
    /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*cover[^"']*["']/i
  ]
  
  for (const selector of imageSelectors) {
    const match = html.match(selector)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return ''
}