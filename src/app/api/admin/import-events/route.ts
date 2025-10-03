import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response'
import { adminAuthMiddleware } from '@/lib/middleware/auth'
import { fetchAllSaltLakeEvents, transformEventbriteEvent, fetchSaltLakeEvents } from '@/services/eventbriteService'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await adminAuthMiddleware(request)
    if (!authResult.isAuthenticated) {
      return NextResponse.json(createErrorResponse('Authentication required', 'Please sign in to test API connection'), { status: 401 })
    }

    console.log('🧪 Testing Eventbrite API connection...')
    
    // Test the API connection
    const events = await fetchSaltLakeEvents()
    
    return NextResponse.json(createSuccessResponse({
      message: `Successfully connected to Eventbrite API! Found ${events.length} events`,
      sampleEvent: events.length > 0 ? events[0].name?.text || events[0].title : 'No events found',
      eventCount: events.length
    }, 'API connection successful'))
    
  } catch (error) {
    console.error('❌ API test failed:', error)
    
    return NextResponse.json(createErrorResponse('API test failed', error.message), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await adminAuthMiddleware(request)
    if (!authResult.isAuthenticated) {
      return NextResponse.json(createErrorResponse('Authentication required', 'Please sign in to import events'), { status: 401 })
    }

    console.log('🔄 Starting REAL Eventbrite import from Salt Lake City...')
    
    // Fetch events from REAL Eventbrite API
    const eventbriteEvents = await fetchAllSaltLakeEvents(3) // Start with 3 pages
    
    if (!eventbriteEvents || eventbriteEvents.length === 0) {
      return NextResponse.json(createSuccessResponse({
        message: 'No events found in Salt Lake City area',
        results: { total: 0, imported: 0, skipped: 0, errors: [] }
      }, 'No events found'))
    }
    
    console.log(`📥 Fetched ${eventbriteEvents.length} REAL events from Eventbrite API`)
    
    // Transform to our schema
    const transformedEvents = eventbriteEvents.map(transformEventbriteEvent)
    
    // Check for duplicates and insert
    const results = {
      total: transformedEvents.length,
      imported: 0,
      skipped: 0,
      errors: []
    }
    
    for (const event of transformedEvents) {
      try {
        // Check if event already exists
        const existing = await db.content.findFirst({
          where: {
            externalEventId: event.externalEventId,
            source: 'eventbrite'
          }
        })
        
        if (existing) {
          // Update existing event
          await db.content.update({
            where: { id: existing.id },
            data: {
              title: event.title,
              description: event.description,
              venue: event.venue,
              address: event.address,
              city: event.city,
              state: event.state,
              zipCode: event.zipCode,
              latitude: event.latitude,
              longitude: event.longitude,
              startTime: new Date(event.startTime),
              endTime: event.endTime ? new Date(event.endTime) : null,
              priceMin: event.priceMin,
              priceMax: event.priceMax,
              currency: event.currency,
              ticketUrl: event.ticketUrl,
              image: event.image,
              updatedAt: new Date()
            }
          })
          results.skipped++
          console.log(`⏭️  Updated existing: ${event.title}`)
        } else {
          // Create new event
          await db.content.create({
            data: {
              type: 'EVENT',
              title: event.title,
              description: event.description,
              venue: event.venue,
              address: event.address,
              city: event.city,
              state: event.state,
              zipCode: event.zipCode,
              latitude: event.latitude,
              longitude: event.longitude,
              startTime: new Date(event.startTime),
              endTime: event.endTime ? new Date(event.endTime) : null,
              priceMin: event.priceMin,
              priceMax: event.priceMax,
              currency: event.currency,
              ticketUrl: event.ticketUrl,
              image: event.image,
              externalEventId: event.externalEventId,
              source: event.source,
              privacyLevel: event.privacyLevel,
              status: event.status,
              creatorId: authResult.user.id, // Use authenticated user as creator
              createdAt: event.createdAt,
              updatedAt: event.updatedAt
            }
          })
          results.imported++
          console.log(`✅ Imported: ${event.title}`)
        }
      } catch (error) {
        results.errors.push({
          event: event.title,
          error: error.message
        })
        console.error(`❌ Error importing ${event.title}:`, error)
      }
    }
    
    console.log('✨ Import complete!')
    console.log(`📊 Results: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`)
    
    return NextResponse.json(createSuccessResponse({
      message: 'Import completed',
      results
    }, 'Events imported successfully'))
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    
    // Check if it's an API authentication error
    if (error.message.includes('401') || error.message.includes('INVALID_AUTH')) {
      return NextResponse.json(createErrorResponse('Eventbrite API authentication failed. Check your token.', error.message), { status: 401 })
    }
    
    return NextResponse.json(createErrorResponse('Import failed', error.message), { status: 500 })
  }
}
