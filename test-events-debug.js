const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function debugEvents() {
  try {
    console.log('🔍 Debugging events in database...')
    
    // Check all content
    const allContent = await db.content.findMany({
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        privacyLevel: true,
        creatorId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    console.log('📊 All content found:', allContent.length)
    allContent.forEach(item => {
      console.log(`- ${item.type}: ${item.title} (${item.status}, ${item.privacyLevel}) - Created: ${item.createdAt}`)
    })
    
    // Check specifically for events
    const events = await db.content.findMany({
      where: {
        type: 'EVENT'
      },
      select: {
        id: true,
        title: true,
        status: true,
        privacyLevel: true,
        creatorId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('📊 Events found:', events.length)
    events.forEach(event => {
      console.log(`- ${event.title} (${event.status}, ${event.privacyLevel}) - Created: ${event.createdAt}`)
    })
    
    // Check for published events
    const publishedEvents = await db.content.findMany({
      where: {
        type: 'EVENT',
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        title: true,
        status: true,
        privacyLevel: true,
        creatorId: true,
        createdAt: true
      }
    })
    
    console.log('📊 Published events found:', publishedEvents.length)
    publishedEvents.forEach(event => {
      console.log(`- ${event.title} (${event.status}, ${event.privacyLevel}) - Created: ${event.createdAt}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.$disconnect()
  }
}

debugEvents()



























