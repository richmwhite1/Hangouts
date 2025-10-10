import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = searchParams.get('limit') || '5'

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Proxy the request to Nominatim API
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Hangouts 3.0 App'
      }
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()

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
    console.error('Location search error:', error)
    return NextResponse.json(
      { error: 'Failed to search locations' },
      { status: 500 }
    )
  }
}
