const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedTestEvents() {
  console.log('🌱 Seeding test events...')

  try {
    // Create test events
    const testEvents = [
      {
        title: "Summer Music Festival",
        description: "A day of live music, food trucks, and fun activities in the park",
        category: "MUSIC",
        venue: "Central Park",
        address: "123 Park Avenue",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        latitude: 40.7829,
        longitude: -73.9654,
        startDate: new Date('2025-07-15'),
        endDate: new Date('2025-07-15'),
        startTime: "14:00",
        endTime: "22:00",
        timezone: "America/New_York",
        priceMin: 25,
        priceMax: 50,
        currency: "USD",
        ticketUrl: "https://example.com/summer-festival",
        coverImage: "/placeholder-event.jpg",
        isPublic: true,
        attendeeCount: 150,
        createdBy: "cmfxfsg530000jpvtkb1aawyv" // Karl's user ID
      },
      {
        title: "Tech Meetup: AI & Machine Learning",
        description: "Join us for an evening of AI discussions, networking, and pizza",
        category: "TECHNOLOGY",
        venue: "Tech Hub",
        address: "456 Innovation Drive",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        latitude: 37.7749,
        longitude: -122.4194,
        startDate: new Date('2025-02-20'),
        endDate: new Date('2025-02-20'),
        startTime: "18:00",
        endTime: "21:00",
        timezone: "America/Los_Angeles",
        priceMin: 0,
        priceMax: 0,
        currency: "USD",
        ticketUrl: "https://example.com/tech-meetup",
        coverImage: "/placeholder-event.jpg",
        isPublic: true,
        attendeeCount: 75,
        createdBy: "cmfxfsg530000jpvtkb1aawyv"
      },
      {
        title: "Wine Tasting Evening",
        description: "Sample wines from local vineyards with expert sommeliers",
        category: "FOOD",
        venue: "Vineyard Estate",
        address: "789 Wine Country Road",
        city: "Napa Valley",
        state: "CA",
        zipCode: "94558",
        latitude: 38.2975,
        longitude: -122.2869,
        startDate: new Date('2025-03-10'),
        endDate: new Date('2025-03-10'),
        startTime: "19:00",
        endTime: "23:00",
        timezone: "America/Los_Angeles",
        priceMin: 85,
        priceMax: 120,
        currency: "USD",
        ticketUrl: "https://example.com/wine-tasting",
        coverImage: "/placeholder-event.jpg",
        isPublic: true,
        attendeeCount: 40,
        createdBy: "cmfxfsg530000jpvtkb1aawyv"
      },
      {
        title: "Beach Volleyball Tournament",
        description: "Competitive beach volleyball tournament with prizes for winners",
        category: "SPORTS",
        venue: "Sunset Beach",
        address: "Beach Access Road",
        city: "Miami",
        state: "FL",
        zipCode: "33139",
        latitude: 25.7617,
        longitude: -80.1918,
        startDate: new Date('2025-06-08'),
        endDate: new Date('2025-06-08'),
        startTime: "09:00",
        endTime: "17:00",
        timezone: "America/New_York",
        priceMin: 15,
        priceMax: 25,
        currency: "USD",
        ticketUrl: "https://example.com/volleyball-tournament",
        coverImage: "/placeholder-event.jpg",
        isPublic: true,
        attendeeCount: 60,
        createdBy: "cmfxfsg530000jpvtkb1aawyv"
      },
      {
        title: "Art Gallery Opening",
        description: "Contemporary art exhibition featuring local and international artists",
        category: "ARTS",
        venue: "Modern Art Gallery",
        address: "321 Gallery Street",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        latitude: 41.8781,
        longitude: -87.6298,
        startDate: new Date('2025-04-12'),
        endDate: new Date('2025-04-12'),
        startTime: "18:30",
        endTime: "22:00",
        timezone: "America/Chicago",
        priceMin: 20,
        priceMax: 35,
        currency: "USD",
        ticketUrl: "https://example.com/art-gallery",
        coverImage: "/placeholder-event.jpg",
        isPublic: true,
        attendeeCount: 90,
        createdBy: "cmfxfsg530000jpvtkb1aawyv"
      }
    ]

    // Create events and collect IDs
    const createdEvents = []
    for (const eventData of testEvents) {
      try {
        const event = await prisma.event.create({
          data: eventData
        })
        createdEvents.push(event)
        console.log(`✅ Created event: ${event.title}`)
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️ Event already exists: ${eventData.title}`)
        } else {
          console.error(`❌ Error creating event ${eventData.title}:`, error.message)
        }
      }
    }

    // Create event tags using actual event IDs
    const eventTags = [
      { eventId: createdEvents[0]?.id, tag: "music" },
      { eventId: createdEvents[0]?.id, tag: "festival" },
      { eventId: createdEvents[0]?.id, tag: "outdoor" },
      { eventId: createdEvents[1]?.id, tag: "technology" },
      { eventId: createdEvents[1]?.id, tag: "networking" },
      { eventId: createdEvents[1]?.id, tag: "ai" },
      { eventId: createdEvents[2]?.id, tag: "sports" },
      { eventId: createdEvents[2]?.id, tag: "beach" },
      { eventId: createdEvents[2]?.id, tag: "tournament" }
    ].filter(tag => tag.eventId) // Only include tags for events that were created

    for (const tagData of eventTags) {
      try {
        await prisma.eventTag.create({
          data: tagData
        })
        console.log(`✅ Created tag: ${tagData.tag}`)
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️ Tag already exists: ${tagData.tag}`)
        } else {
          console.error(`❌ Error creating tag ${tagData.tag}:`, error.message)
        }
      }
    }

    console.log('🎉 Test events seeded successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding events:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTestEvents()
