import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')

    if (!lat || !lon) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Latitude and longitude are required' 
        },
        { status: 400 }
      )
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid latitude or longitude' 
        },
        { status: 400 }
      )
    }

    // Proxy the request to Nominatim API
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Hangouts 3.0 App/1.0'
      }
    })

    if (!response.ok) {
      logger.warn(`Nominatim reverse geocoding error: ${response.status} for lat=${latitude}, lon=${longitude}`)
      return NextResponse.json({
        success: false,
        error: 'Reverse geocoding failed'
      }, { status: response.status })
    }

    const data = await response.json()

    // Transform the data to match what the frontend expects
    const location = {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      displayName: data.display_name,
      formatted_address: data.display_name,
      address: {
        city: data.address?.city || data.address?.town || data.address?.village || '',
        state: data.address?.state || data.address?.region || '',
        country: data.address?.country || '',
        postcode: data.address?.postcode || '',
        street: data.address?.road || '',
        house_number: data.address?.house_number || ''
      },
      // Additional fields for compatibility
      city: data.address?.city || data.address?.town || data.address?.village || '',
      state: data.address?.state || data.address?.region || '',
      country: data.address?.country || ''
    }

    return NextResponse.json({
      success: true,
      location
    })
  } catch (error) {
    logger.error('Reverse geocoding error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}





