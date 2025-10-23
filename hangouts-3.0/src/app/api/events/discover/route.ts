import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import axios from 'axios'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

interface EventDiscoveryRequest {
  query: string
  location?: string
}

interface EventResult {
  title: string
  venue: string
  date: string
  time: string
  price: string
  url: string
  description?: string
  imageUrl?: string
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

    const body: EventDiscoveryRequest = await request.json()
    const { query, location } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(createErrorResponse('Invalid request', 'Query is required'), { status: 400 })
    }

    // Get user's location from profile if not provided
    const userLocation = location || 'San Francisco, CA' // Default location for now

    // Call Perplexity API to search for events
    const perplexityResponse = await searchEventsWithPerplexity(query, userLocation)
    
    if (!perplexityResponse.success) {
      return NextResponse.json(createErrorResponse('Search failed', perplexityResponse.error || 'Failed to search for events'), { status: 500 })
    }

    return NextResponse.json(createSuccessResponse(perplexityResponse.events, 'Events discovered successfully'))

  } catch (error) {
    logger.error('Error in event discovery:', error)
    return NextResponse.json(createErrorResponse('Failed to discover events', error.message), { status: 500 })
  }
}

async function searchEventsWithPerplexity(query: string, location: string): Promise<{ success: boolean; events?: EventResult[]; error?: string }> {
  try {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured')
    }

    // Construct search query for Perplexity
    const searchQuery = `Find events in ${location} for: ${query}. Return 3-5 events with details including event name, venue, date, time, price, and ticket URL. Format as JSON array.`
    
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are an event discovery assistant. Search for events and return structured data in JSON format. Always include event name, venue, date, time, price, and ticket URL when available.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    )

    const content = response.data.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from Perplexity')
    }

    // Parse the JSON response from Perplexity
    let events: EventResult[] = []
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: try to parse the entire content as JSON
        events = JSON.parse(content)
      }
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      events = parseEventsFromText(content)
    }

    // Validate and clean the events
    const validEvents = events
      .filter(event => event.title && event.venue && event.date)
      .slice(0, 5) // Limit to 5 events
      .map(event => ({
        title: event.title || 'Unknown Event',
        venue: event.venue || 'Unknown Venue',
        date: event.date || 'TBD',
        time: event.time || 'TBD',
        price: event.price || 'Price varies',
        url: event.url || '#',
        description: event.description || '',
        imageUrl: event.imageUrl || ''
      }))

    return { success: true, events: validEvents }

  } catch (error) {
    logger.error('Perplexity API error:', error)
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message || 'Failed to search for events'
    }
  }
}

function parseEventsFromText(text: string): EventResult[] {
  // Fallback parser for when JSON parsing fails
  const events: EventResult[] = []
  const lines = text.split('\n').filter(line => line.trim())
  
  let currentEvent: Partial<EventResult> = {}
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine.includes('Event:') || trimmedLine.includes('Title:')) {
      if (currentEvent.title) {
        events.push(currentEvent as EventResult)
      }
      currentEvent = { title: trimmedLine.replace(/^(Event:|Title:)\s*/i, '') }
    } else if (trimmedLine.includes('Venue:') || trimmedLine.includes('Location:')) {
      currentEvent.venue = trimmedLine.replace(/^(Venue:|Location:)\s*/i, '')
    } else if (trimmedLine.includes('Date:')) {
      currentEvent.date = trimmedLine.replace(/^Date:\s*/i, '')
    } else if (trimmedLine.includes('Time:')) {
      currentEvent.time = trimmedLine.replace(/^Time:\s*/i, '')
    } else if (trimmedLine.includes('Price:')) {
      currentEvent.price = trimmedLine.replace(/^Price:\s*/i, '')
    } else if (trimmedLine.includes('URL:') || trimmedLine.includes('Link:')) {
      currentEvent.url = trimmedLine.replace(/^(URL:|Link:)\s*/i, '')
    }
  }
  
  if (currentEvent.title) {
    events.push(currentEvent as EventResult)
  }
  
  return events
}
