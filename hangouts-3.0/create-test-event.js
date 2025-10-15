const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestEvent() {
  try {
    // Get the test user
    const user = await prisma.user.findFirst({
      where: { username: 'testuser' }
    })

    if (!user) {
      console.log('Test user not found, creating...')
      return
    }

    // Create a test event
    const event = await prisma.content.create({
      data: {
        id: 'test_event_456',
        type: 'EVENT',
        title: 'Test Public Event',
        description: 'This is a test event for sharing and testing public viewing',
        venue: 'Test Venue',
        city: 'Test City',
        startTime: new Date('2024-12-26T19:00:00Z'),
        endTime: new Date('2024-12-26T23:00:00Z'),
        priceMin: 25.00,
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date()
      }
    })

    console.log('Created test event:', event.id)
    console.log('Event title:', event.title)
    console.log('Event privacy:', event.privacyLevel)
    console.log('Event status:', event.status)

  } catch (error) {
    console.error('Error creating test event:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestEvent()
