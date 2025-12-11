import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY

/**
 * GET /api/places/autocomplete
 * 
 * Google Places Autocomplete API proxy
 * Uses Legacy Places API (more reliable) with fallback to New API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')
    const location = searchParams.get('location') // Optional: bias results to location

    if (!input || input.length < 2) {
      return NextResponse.json(
        { error: 'Input query is required (min 2 characters)' },
        { status: 400 }
      )
    }

    if (!GOOGLE_SEARCH_API_KEY) {
      logger.error('GOOGLE_SEARCH_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      )
    }

    // Use Legacy Places API first (more reliable and widely supported)
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_SEARCH_API_KEY}&types=geocode|establishment`
    
    try {
      const legacyResponse = await fetch(legacyUrl)
      const legacyData = await legacyResponse.json()
      
      if (legacyResponse.ok && legacyData.status === 'OK' && legacyData.predictions) {
        logger.info(`Legacy Places API success: ${legacyData.predictions.length} predictions`)
        return NextResponse.json({
          success: true,
          predictions: legacyData.predictions || []
        })
      }
      
      if (legacyData.status === 'REQUEST_DENIED') {
        logger.error('Places API denied:', legacyData.error_message)
        return NextResponse.json({
          success: false,
          error: legacyData.error_message || 'Places API access denied. Please enable Places API in Google Cloud Console.',
          predictions: []
        }, { status: 403 })
      }
      
      logger.warn('Legacy Places API returned non-OK status:', legacyData.status, legacyData.error_message)
    } catch (legacyError: any) {
      logger.error('Legacy Places API error:', legacyError)
    }

    // Fallback to New Places API if legacy fails
    try {
      const url = new URL('https://places.googleapis.com/v1/places:autocomplete')
      
      const requestBody: any = {
        input: input,
        includedRegionCodes: ['us'], // Focus on US results
        locationBias: location ? {
          circle: {
            center: {
              latitude: parseFloat(location.split(',')[0]),
              longitude: parseFloat(location.split(',')[1])
            },
            radius: 50000 // 50km
          }
        } : undefined
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_SEARCH_API_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Handle new Places API format
        let predictions: any[] = []
        if (data.suggestions && Array.isArray(data.suggestions)) {
          predictions = data.suggestions
            .filter((s: any) => s.placePrediction)
            .map((s: any) => {
              const text = s.placePrediction?.text?.text || ''
              const parts = text.split(',')
              return {
                description: text,
                place_id: s.placePrediction?.placeId,
                structured_formatting: {
                  main_text: parts[0] || text,
                  secondary_text: parts.slice(1).join(',') || ''
                }
              }
            })
        }
        
        if (predictions.length > 0) {
          logger.info(`New Places API success: ${predictions.length} predictions`)
          return NextResponse.json({
            success: true,
            predictions: predictions
          })
        }
      } else {
        const errorText = await response.text()
        logger.error('New Places API error:', { status: response.status, error: errorText })
      }
    } catch (newApiError: any) {
      logger.error('New Places API error:', newApiError)
    }

    // If both APIs fail, return empty results
    return NextResponse.json({
      success: true,
      predictions: [],
      error: 'No results found. Please check that Places API is enabled in Google Cloud Console.'
    })
  } catch (error: any) {
    logger.error('Error in Places autocomplete:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get place suggestions',
        predictions: []
      },
      { status: 500 }
    )
  }
}


