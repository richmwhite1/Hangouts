import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { parse } from 'node-html-parser'

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
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const root = parse(html)
    
    // Extract data using CSS selectors
    const title = root.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                 root.querySelector('title')?.text ||
                 root.querySelector('h1')?.text || 
                 'Event from URL'
    
    const description = root.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                       root.querySelector('meta[name="description"]')?.getAttribute('content') ||
                       root.querySelector('p')?.text || 
                       ''

    const imageUrl = root.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                     root.querySelector('img')?.getAttribute('src') || 
                     ''

    // Basic extraction for location and date (can be improved with more specific selectors)
    const location = root.querySelector('meta[name="location"]')?.getAttribute('content') ||
                     root.querySelector('.event-location')?.text ||
                     root.querySelector('[itemprop="location"]')?.text || 
                     ''

    const startDate = root.querySelector('meta[property="og:event:start_time"]')?.getAttribute('content') ||
                      root.querySelector('[itemprop="startDate"]')?.getAttribute('content') ||
                      root.querySelector('.event-date')?.text || 
                      new Date().toISOString()

    const endDate = root.querySelector('meta[property="og:event:end_time"]')?.getAttribute('content') ||
                    root.querySelector('[itemprop="endDate"]')?.getAttribute('content') || 
                    ''

    const price = root.querySelector('.event-price')?.text || 
                  root.querySelector('[itemprop="price"]')?.text || 
                  ''

    // Extract price value
    let priceMin = 0
    if (price) {
      const priceMatch = price.match(/\$?(\d+(?:\.\d{2})?)/)
      if (priceMatch && priceMatch[1]) {
        priceMin = parseFloat(priceMatch[1])
      }
    }

    const scrapedData = {
      title: title.trim().substring(0, 200),
      description: description.trim().substring(0, 500),
      venue: location.trim(),
      address: location.trim(),
      city: '',
      state: '',
      zipCode: '',
      startDate: startDate,
      startTime: '',
      endTime: endDate,
      priceMin: priceMin,
      priceMax: null,
      currency: price.includes('$') ? 'USD' : 'USD',
      coverImage: imageUrl.trim(),
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
