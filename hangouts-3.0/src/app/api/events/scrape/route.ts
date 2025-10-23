import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import axios from 'axios'
import OpenAI from 'openai'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

interface EventScrapingRequest {
  eventUrl: string
  basicEventData?: {
    title: string
    venue: string
    date: string
    time: string
    price: string
  }
}

interface ScrapedEventData {
  title: string
  artist?: string
  venue: {
    name: string
    address: string
  }
  datetime: string
  price: {
    min?: number
    max?: number
    currency: string
    description: string
  }
  description: string
  imageUrl?: string
  ticketUrl: string
  ageRestriction?: string
  category?: string
  tags?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const clerkUser = await getClerkApiUser()
    if (!clerkUser) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'User not found'), { status: 401 })
    }

    const body: EventScrapingRequest = await request.json()
    const { eventUrl, basicEventData } = body

    if (!eventUrl || !eventUrl.startsWith('http')) {
      return NextResponse.json(createErrorResponse('Invalid request', 'Valid event URL is required'), { status: 400 })
    }

    // Step 1: Scrape the webpage with Firecrawl
    const scrapedContent = await scrapeWithFirecrawl(eventUrl)
    
    if (!scrapedContent.success) {
      // Fallback to basic event data if scraping fails
      if (basicEventData) {
        const fallbackEvent = createFallbackEvent(basicEventData, eventUrl)
        return NextResponse.json(createSuccessResponse(fallbackEvent, 'Event details retrieved (fallback data)'))
      }
      return NextResponse.json(createErrorResponse('Scraping failed', scrapedContent.error || 'Failed to scrape event details'), { status: 500 })
    }

    // Step 2: Extract structured data with GPT-4o-mini
    const extractedData = await extractEventDataWithGPT(scrapedContent.content, eventUrl)
    
    if (!extractedData.success) {
      // Fallback to basic event data if extraction fails
      if (basicEventData) {
        const fallbackEvent = createFallbackEvent(basicEventData, eventUrl)
        return NextResponse.json(createSuccessResponse(fallbackEvent, 'Event details retrieved (fallback data)'))
      }
      return NextResponse.json(createErrorResponse('Extraction failed', extractedData.error || 'Failed to extract event details'), { status: 500 })
    }

    return NextResponse.json(createSuccessResponse(extractedData.data, 'Event details scraped successfully'))

  } catch (error) {
    logger.error('Error in event scraping:', error)
    return NextResponse.json(createErrorResponse('Failed to scrape event', error.message), { status: 500 })
  }
}

async function scrapeWithFirecrawl(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY
    if (!firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    const response = await axios.post(
      'https://api.firecrawl.dev/v0/scrape',
      {
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000, // Wait 2 seconds for dynamic content
        timeout: 30000 // 30 second timeout
      },
      {
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 35000 // Slightly longer than Firecrawl timeout
      }
    )

    const content = response.data?.data?.markdown
    if (!content) {
      throw new Error('No content returned from Firecrawl')
    }

    return { success: true, content }

  } catch (error) {
    logger.error('Firecrawl API error:', error)
    return { 
      success: false, 
      error: error.response?.data?.error || error.message || 'Failed to scrape webpage'
    }
  }
}

async function extractEventDataWithGPT(content: string, originalUrl: string): Promise<{ success: boolean; data?: ScrapedEventData; error?: string }> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey
    })

    const systemPrompt = `You are an expert event data extractor. Extract structured event information from webpage content and return it as valid JSON.

Required fields:
- title: Event name
- artist: Performer/artist name (if applicable)
- venue: Object with name and address
- datetime: ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
- price: Object with min, max, currency, and description
- description: Event description
- imageUrl: Event image URL (if available)
- ticketUrl: URL to purchase tickets
- ageRestriction: Age restriction (if any)
- category: Event category (CONCERT, COMEDY, SPORTS, ART, FOOD, OTHER)
- tags: Array of relevant tags

Rules:
1. Return ONLY valid JSON, no other text
2. Use USD as default currency
3. If price range not available, use description field
4. Extract actual dates/times, not relative terms
5. Clean and normalize all text fields
6. If information is missing, use null or empty string appropriately`

    const userPrompt = `Extract event details from this webpage content:

URL: ${originalUrl}

Content:
${content.substring(0, 8000)} // Limit content to avoid token limits

Return the structured event data as JSON.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.1
    })

    const extractedText = response.choices[0]?.message?.content
    if (!extractedText) {
      throw new Error('No content returned from OpenAI')
    }

    const extractedData = JSON.parse(extractedText) as ScrapedEventData

    // Validate required fields
    if (!extractedData.title || !extractedData.venue?.name) {
      throw new Error('Missing required fields: title and venue name')
    }

    // Clean and normalize the data
    const cleanedData = cleanEventData(extractedData, originalUrl)

    return { success: true, data: cleanedData }

  } catch (error) {
    logger.error('OpenAI extraction error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to extract event data'
    }
  }
}

function cleanEventData(data: ScrapedEventData, originalUrl: string): ScrapedEventData {
  return {
    title: data.title?.trim() || 'Unknown Event',
    artist: data.artist?.trim() || undefined,
    venue: {
      name: data.venue?.name?.trim() || 'Unknown Venue',
      address: data.venue?.address?.trim() || ''
    },
    datetime: data.datetime || new Date().toISOString(),
    price: {
      min: data.price?.min || undefined,
      max: data.price?.max || undefined,
      currency: data.price?.currency || 'USD',
      description: data.price?.description?.trim() || 'Price varies'
    },
    description: data.description?.trim() || '',
    imageUrl: data.imageUrl || undefined,
    ticketUrl: data.ticketUrl || originalUrl,
    ageRestriction: data.ageRestriction?.trim() || undefined,
    category: data.category || 'OTHER',
    tags: data.tags || []
  }
}

function createFallbackEvent(basicData: any, url: string): ScrapedEventData {
  return {
    title: basicData.title || 'Unknown Event',
    artist: undefined,
    venue: {
      name: basicData.venue || 'Unknown Venue',
      address: ''
    },
    datetime: new Date().toISOString(), // Will need to be parsed from basicData.date/time
    price: {
      currency: 'USD',
      description: basicData.price || 'Price varies'
    },
    description: '',
    imageUrl: undefined,
    ticketUrl: url,
    ageRestriction: undefined,
    category: 'OTHER',
    tags: []
  }
}
