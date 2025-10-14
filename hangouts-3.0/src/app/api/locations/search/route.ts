import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = searchParams.get('limit') || '5'

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        success: true, 
        locations: [] 
      })
    }

    // Proxy the request to Nominatim API with better error handling
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Hangouts 3.0 App/1.0'
      },
      timeout: 10000 // 10 second timeout
    })

    if (!response.ok) {
      logger.warn(`Nominatim API error: ${response.status} for query: ${query}`);
      return NextResponse.json({
        success: true,
        locations: []
      })
    }

    const data = await response.json()

    // Handle empty results gracefully
    if (!Array.isArray(data)) {
      return NextResponse.json({
        success: true,
        locations: []
      })
    }

    // Transform the data to a more usable format
    const locations = data.map((item: any) => ({
      id: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      address: item.address,
      type: item.type,
      importance: item.importance
    }))

    return NextResponse.json({
      success: true,
      locations
    })
  } catch (error) {
    logger.error('Location search error:', error);
    // Return empty results instead of error to prevent UI issues
    return NextResponse.json({
      success: true,
      locations: []
    })
  }
}
