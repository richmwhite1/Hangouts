const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestContentWithPhotos() {
  try {
    console.log('Creating test content with photos...')

    // First, get or create a test user
    let testUser = await prisma.user.findFirst({
      where: {
        email: 'test@example.com'
      }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          clerkId: 'test_clerk_id_123'
        }
      })
      console.log('Created test user:', testUser.id)
    }

    // Create test event with photos
    const testEvent = await prisma.content.upsert({
      where: { id: 'test_event_with_photos' },
      update: {},
      create: {
        id: 'test_event_with_photos',
        type: 'EVENT',
        title: 'Amazing Concert in the Park',
        description: 'Join us for an incredible outdoor concert featuring local bands and amazing food trucks!',
        venue: 'Central Park',
        city: 'New York',
        startTime: new Date('2024-12-25T19:00:00Z'),
        endTime: new Date('2024-12-25T23:00:00Z'),
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
        priceMin: 25,
        priceMax: 50,
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: testUser.id,
        updatedAt: new Date()
      }
    })

    // Create photos for the event (skip if they exist)
    try {
      await prisma.photos.createMany({
        data: [
        {
          id: 'photo_1',
          creatorId: testUser.id,
          contentId: testEvent.id,
          caption: 'Main stage setup',
          isPublic: true,
          originalUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=800&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop',
          smallUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop',
          mediumUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
          largeUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
          originalWidth: 1200,
          originalHeight: 800,
          fileSize: 500000,
          mimeType: 'image/jpeg',
          updatedAt: new Date()
        },
        {
          id: 'photo_2',
          creatorId: testUser.id,
          contentId: testEvent.id,
          caption: 'Food trucks and vendors',
          isPublic: true,
          originalUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=800&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop',
          smallUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop',
          mediumUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop',
          largeUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
          originalWidth: 1200,
          originalHeight: 800,
          fileSize: 450000,
          mimeType: 'image/jpeg',
          updatedAt: new Date()
        }
      ]
    })
    } catch (error) {
      if (error.code !== 'P2002') { // Skip unique constraint errors
        throw error
      }
      console.log('Event photos already exist, skipping...')
    }

    // Create test hangout with photos
    const testHangout = await prisma.content.upsert({
      where: { id: 'test_hangout_with_photos' },
      update: {},
      create: {
        id: 'test_hangout_with_photos',
        type: 'HANGOUT',
        title: 'Beach Volleyball Tournament',
        description: 'Join us for a fun beach volleyball tournament! All skill levels welcome.',
        location: 'Santa Monica Beach',
        startTime: new Date('2024-12-26T10:00:00Z'),
        endTime: new Date('2024-12-26T16:00:00Z'),
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: testUser.id,
        updatedAt: new Date()
      }
    })

    // Create photos for the hangout (skip if they exist)
    try {
      await prisma.photos.createMany({
        data: [
        {
          id: 'photo_3',
          creatorId: testUser.id,
          contentId: testHangout.id,
          caption: 'Beach volleyball setup',
          isPublic: true,
          originalUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=800&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=150&h=150&fit=crop',
          smallUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
          mediumUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop',
          largeUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
          originalWidth: 1200,
          originalHeight: 800,
          fileSize: 480000,
          mimeType: 'image/jpeg',
          updatedAt: new Date()
        }
      ]
    })
    } catch (error) {
      if (error.code !== 'P2002') { // Skip unique constraint errors
        throw error
      }
      console.log('Hangout photos already exist, skipping...')
    }

    console.log('✅ Created test content with photos:')
    console.log('- Event:', testEvent.title)
    console.log('- Hangout:', testHangout.title)
    console.log('- User:', testUser.name)

  } catch (error) {
    console.error('Error creating test content:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestContentWithPhotos()
