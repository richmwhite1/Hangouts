#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding public content for local development...')

  try {
    // Find or create a test user
    let user = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: 'user_test_001',
          clerkId: 'test_clerk_001',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test'
        }
      })
      console.log('✅ Created test user')
    }

    // Create public hangouts
    const hangout1 = await prisma.content.upsert({
      where: { id: 'hangout_public_001' },
      update: {},
      create: {
        id: 'hangout_public_001',
        type: 'HANGOUT',
        title: 'Weekend Coffee Meetup',
        description: 'Let\'s grab coffee this weekend and catch up!',
        location: 'Local Coffee Shop, Downtown',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
        creatorId: user.id,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
        updatedAt: new Date()
      }
    })
    console.log('✅ Created hangout:', hangout1.title)

    const hangout2 = await prisma.content.upsert({
      where: { id: 'hangout_public_002' },
      update: {},
      create: {
        id: 'hangout_public_002',
        type: 'HANGOUT',
        title: 'Board Game Night',
        description: 'Bring your favorite games! All levels welcome.',
        location: 'Community Center',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        creatorId: user.id,
        image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800',
        updatedAt: new Date()
      }
    })
    console.log('✅ Created hangout:', hangout2.title)

    // Create public events
    const event1 = await prisma.content.upsert({
      where: { id: 'event_public_001' },
      update: {},
      create: {
        id: 'event_public_001',
        type: 'EVENT',
        title: 'Summer Music Festival',
        description: 'Join us for an amazing day of live music, food trucks, and fun!',
        location: 'City Park Amphitheater',
        venue: 'City Park',
        city: 'San Francisco',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        creatorId: user.id,
        priceMin: 0,
        priceMax: 50,
        image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
        updatedAt: new Date()
      }
    })
    console.log('✅ Created event:', event1.title)

    const event2 = await prisma.content.upsert({
      where: { id: 'event_public_002' },
      update: {},
      create: {
        id: 'event_public_002',
        type: 'EVENT',
        title: 'Tech Meetup: AI & Machine Learning',
        description: 'Network with fellow tech enthusiasts and learn about the latest in AI.',
        location: 'Innovation Hub, 123 Tech Street',
        venue: 'Innovation Hub',
        city: 'San Francisco',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        creatorId: user.id,
        priceMin: 0,
        priceMax: 0,
        image: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=800',
        updatedAt: new Date()
      }
    })
    console.log('✅ Created event:', event2.title)

    const event3 = await prisma.content.upsert({
      where: { id: 'event_public_003' },
      update: {},
      create: {
        id: 'event_public_003',
        type: 'EVENT',
        title: 'Food Truck Festival',
        description: 'Sample delicious food from 20+ local food trucks!',
        location: 'Waterfront Plaza',
        venue: 'Waterfront Plaza',
        city: 'Oakland',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        creatorId: user.id,
        priceMin: 10,
        priceMax: 30,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        updatedAt: new Date()
      }
    })
    console.log('✅ Created event:', event3.title)

    console.log('\n🎉 Successfully seeded public content!')
    console.log('\n📋 Summary:')
    console.log(`  - ${2} public hangouts`)
    console.log(`  - ${3} public events`)
    console.log(`  - All content is PUBLIC and will appear in feeds`)

  } catch (error) {
    console.error('❌ Error seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()

