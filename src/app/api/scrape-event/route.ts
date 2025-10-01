import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  let browser = null
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Get page content
    const content = await page.content()
    const $ = cheerio.load(content)

    // Extract data from various sources
    const scrapedData = {
      title: '',
      description: '',
      venue: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      startDate: '',
      startTime: '',
      endTime: '',
      priceMin: null,
      priceMax: null,
      currency: 'USD',
      coverImage: '',
      categories: [],
      tags: []
    }

    // Extract title from multiple sources
    scrapedData.title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      ''

    // Extract description
    scrapedData.description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('p').first().text() ||
      ''

    // Extract venue/address information
    const venueText = 
      $('[class*="venue"]').text() ||
      $('[class*="location"]').text() ||
      $('[class*="address"]').text() ||
      $('[class*="place"]').text() ||
      ''

    if (venueText) {
      // Try to parse venue and address
      const lines = venueText.split('\n').map(line => line.trim()).filter(line => line)
      if (lines.length > 0) {
        scrapedData.venue = lines[0]
        if (lines.length > 1) {
          scrapedData.address = lines[1]
        }
      }
    }

    // Extract date/time information
    const dateTimeText = 
      $('[class*="date"]').text() ||
      $('[class*="time"]').text() ||
      $('[class*="datetime"]').text() ||
      $('time').text() ||
      ''

    if (dateTimeText) {
      // Try to parse date and time
      const dateMatch = dateTimeText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/)
      const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*(AM|PM|am|pm)?)/)
      
      if (dateMatch) {
        scrapedData.startDate = dateMatch[1]
      }
      if (timeMatch) {
        scrapedData.startTime = timeMatch[1]
      }
    }

    // Extract price information
    const priceText = 
      $('[class*="price"]').text() ||
      $('[class*="cost"]').text() ||
      $('[class*="ticket"]').text() ||
      ''

    if (priceText) {
      const priceMatch = priceText.match(/\$(\d+(?:\.\d{2})?)/g)
      if (priceMatch) {
        const prices = priceMatch.map(p => parseFloat(p.replace('$', '')))
        if (prices.length > 0) {
          scrapedData.priceMin = Math.min(...prices)
          scrapedData.priceMax = Math.max(...prices)
        }
      }
    }

    // Extract cover image
    scrapedData.coverImage = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('img').first().attr('src') ||
      ''

    // Make image URL absolute if it's relative
    if (scrapedData.coverImage && !scrapedData.coverImage.startsWith('http')) {
      scrapedData.coverImage = new URL(scrapedData.coverImage, url).toString()
    }

    // Extract categories/tags
    const categoryText = 
      $('[class*="category"]').text() ||
      $('[class*="tag"]').text() ||
      $('[class*="genre"]').text() ||
      ''

    if (categoryText) {
      scrapedData.tags = categoryText.split(/[,\s]+/).filter(tag => tag.length > 0)
    }

    // Look for structured data (JSON-LD)
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonData = JSON.parse($(element).html() || '')
        if (jsonData['@type'] === 'Event' || jsonData['@type'] === 'MusicEvent') {
          if (jsonData.name && !scrapedData.title) {
            scrapedData.title = jsonData.name
          }
          if (jsonData.description && !scrapedData.description) {
            scrapedData.description = jsonData.description
          }
          if (jsonData.location) {
            if (jsonData.location.name && !scrapedData.venue) {
              scrapedData.venue = jsonData.location.name
            }
            if (jsonData.location.address) {
              const addr = jsonData.location.address
              if (typeof addr === 'string') {
                scrapedData.address = addr
              } else {
                scrapedData.address = addr.streetAddress || ''
                scrapedData.city = addr.addressLocality || ''
                scrapedData.state = addr.addressRegion || ''
                scrapedData.zipCode = addr.postalCode || ''
              }
            }
          }
          if (jsonData.startDate && !scrapedData.startDate) {
            const startDate = new Date(jsonData.startDate)
            scrapedData.startDate = startDate.toISOString().split('T')[0]
            scrapedData.startTime = startDate.toTimeString().split(' ')[0].substring(0, 5)
          }
          if (jsonData.image && !scrapedData.coverImage) {
            scrapedData.coverImage = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    })

    // Clean up the data
    Object.keys(scrapedData).forEach(key => {
      if (typeof scrapedData[key] === 'string') {
        scrapedData[key] = scrapedData[key].trim()
      }
    })

    // Remove empty values
    const cleanedData = {}
    Object.keys(scrapedData).forEach(key => {
      if (scrapedData[key] !== '' && scrapedData[key] !== null && scrapedData[key] !== undefined) {
        cleanedData[key] = scrapedData[key]
      }
    })

    console.log('✅ Scraped data:', cleanedData)

    return NextResponse.json({
      success: true,
      data: cleanedData
    })

  } catch (error) {
    console.error('Error scraping event URL:', error)
    return NextResponse.json(
      { error: 'Failed to scrape event data' },
      { status: 500 }
    )
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
