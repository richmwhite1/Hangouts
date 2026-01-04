/**
 * Example usage of EventService
 * 
 * This file demonstrates how to use the EventService for common operations
 * including creating events, finding nearby events, and preventing duplicates.
 */

import { EventService } from '@/lib/services/eventService'
import { UserRole } from '@prisma/client'

// Example 1: Creating a new event
async function createEventExample() {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.USER,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
    })

    const result = await eventService.createEvent({
        title: 'Tech Conference 2026',
        description: 'Annual technology conference with industry leaders',
        latitude: 37.7749,
        longitude: -122.4194,
        startTime: new Date('2026-06-15T09:00:00Z'),
        endTime: new Date('2026-06-15T17:00:00Z'),
        sourceUrl: 'https://eventbrite.com/tech-conf-2026',
        externalId: 'evt_12345',
        categoryTags: ['technology', 'business', 'networking'],
        interestScore: 85
    })

    if (result.success) {
        console.log('✅ Event created:', result.data?.id)
        return result.data
    } else {
        console.error('❌ Error:', result.error)
        return null
    }
}

// Example 2: Finding nearby events
async function findNearbyEventsExample() {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.USER
    })

    // Find events within 10km of San Francisco
    const result = await eventService.findNearbyEvents({
        latitude: 37.7749,
        longitude: -122.4194,
        radiusKm: 10,
        startTimeAfter: new Date(), // Only upcoming events
        categoryTags: ['music', 'arts'],
        minInterestScore: 50
    }, {
        page: 1,
        limit: 20
    })

    if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} nearby events:`)
        result.data.forEach(event => {
            console.log(`  - ${event.title} (${event.distance.toFixed(2)}km away)`)
        })

        if (result.pagination) {
            console.log(`📄 Page ${result.pagination.page} of ${result.pagination.totalPages}`)
            console.log(`📊 Total events: ${result.pagination.total}`)
        }
    } else {
        console.error('❌ Error:', result.error)
    }
}

// Example 3: Upserting events (AI agent pattern)
async function upsertEventExample() {
    const eventService = new EventService({
        userId: 'ai-agent-001',
        userRole: UserRole.USER
    })

    // This will create a new event or update if it already exists
    // based on the combination of sourceUrl + externalId
    const result = await eventService.upsertEvent({
        title: 'Summer Music Festival',
        description: 'Outdoor music festival featuring top artists',
        latitude: 34.0522,
        longitude: -118.2437,
        startTime: new Date('2026-07-20T14:00:00Z'),
        endTime: new Date('2026-07-20T23:00:00Z'),
        sourceUrl: 'https://ticketmaster.com/summer-fest',
        externalId: 'tm_67890',
        categoryTags: ['music', 'festival', 'outdoors'],
        interestScore: 92
    })

    if (result.success) {
        console.log('✅ Event upserted:', result.data?.id)
        console.log('   This prevents duplicates from AI agents!')
        return result.data
    } else {
        console.error('❌ Error:', result.error)
        return null
    }
}

// Example 4: Listing events with filters
async function listEventsExample() {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.USER
    })

    const result = await eventService.listEvents({
        categoryTags: ['technology', 'business'],
        startTimeAfter: new Date('2026-01-01'),
        startTimeBefore: new Date('2026-12-31'),
        minInterestScore: 70
    }, {
        page: 1,
        limit: 10
    })

    if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} events matching filters`)
        result.data.forEach(event => {
            console.log(`  - ${event.title} (Score: ${event.interestScore})`)
        })
    }
}

// Example 5: Searching events
async function searchEventsExample() {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.USER
    })

    const result = await eventService.searchEvents('music festival', {
        page: 1,
        limit: 10
    })

    if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} events matching "music festival"`)
        result.data.forEach(event => {
            console.log(`  - ${event.title}`)
        })
    }
}

// Example 6: Getting upcoming events
async function getUpcomingEventsExample() {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.USER
    })

    const result = await eventService.getUpcomingEvents({
        page: 1,
        limit: 20
    })

    if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} upcoming events`)
        result.data.forEach(event => {
            const daysUntil = event.startTime
                ? Math.ceil((event.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 'TBD'
            console.log(`  - ${event.title} (in ${daysUntil} days)`)
        })
    }
}

// Example 7: Updating an event
async function updateEventExample(eventId: string) {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.USER
    })

    const result = await eventService.updateEvent(eventId, {
        interestScore: 95, // Increase interest score
        categoryTags: ['technology', 'business', 'networking', 'ai'] // Add new tag
    })

    if (result.success) {
        console.log('✅ Event updated:', result.data?.id)
        return result.data
    } else {
        console.error('❌ Error:', result.error)
        return null
    }
}

// Example 8: Deleting an event
async function deleteEventExample(eventId: string) {
    const eventService = new EventService({
        userId: 'user-123',
        userRole: UserRole.ADMIN // Only admins should delete
    })

    const result = await eventService.deleteEvent(eventId)

    if (result.success) {
        console.log('✅ Event deleted successfully')
    } else {
        console.error('❌ Error:', result.error)
    }
}

// Run all examples
async function runExamples() {
    console.log('🚀 EventService Examples\n')

    console.log('1️⃣ Creating an event...')
    const newEvent = await createEventExample()
    console.log()

    console.log('2️⃣ Finding nearby events...')
    await findNearbyEventsExample()
    console.log()

    console.log('3️⃣ Upserting an event (prevents duplicates)...')
    await upsertEventExample()
    console.log()

    console.log('4️⃣ Listing events with filters...')
    await listEventsExample()
    console.log()

    console.log('5️⃣ Searching events...')
    await searchEventsExample()
    console.log()

    console.log('6️⃣ Getting upcoming events...')
    await getUpcomingEventsExample()
    console.log()

    if (newEvent) {
        console.log('7️⃣ Updating an event...')
        await updateEventExample(newEvent.id)
        console.log()

        console.log('8️⃣ Deleting an event...')
        await deleteEventExample(newEvent.id)
    }
}

// Export for use in other files
export {
    createEventExample,
    findNearbyEventsExample,
    upsertEventExample,
    listEventsExample,
    searchEventsExample,
    getUpcomingEventsExample,
    updateEventExample,
    deleteEventExample,
    runExamples
}
