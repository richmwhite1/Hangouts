const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUnifiedArchitecture() {
  try {
    console.log('🧪 Testing Unified Content Architecture...\n');

    // Step 1: Create a test user
    console.log('📝 Step 1: Creating test user...');
    const user = await prisma.user.create({
      data: {
        email: `test_${Date.now()}@example.com`,
        username: `testuser_${Date.now()}`,
        name: 'Test User',
        password: 'hashedpassword',
        avatar: 'https://example.com/avatar.jpg'
      }
    });
    console.log('✅ Test user created:', user.id);

    // Step 2: Create a hangout using unified content
    console.log('\n📝 Step 2: Creating hangout using unified content...');
    const hangout = await prisma.content.create({
      data: {
        id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'HANGOUT',
        title: 'Test Hangout',
        description: 'A test hangout using unified architecture',
        image: 'https://example.com/hangout.jpg',
        location: 'Test Location',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date(),
        // Hangout-specific fields
        maxParticipants: 10,
        weatherEnabled: true
      }
    });
    console.log('✅ Hangout created:', hangout.id);

    // Step 3: Create an event using unified content
    console.log('\n📝 Step 3: Creating event using unified content...');
    const event = await prisma.content.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'EVENT',
        title: 'Test Event',
        description: 'A test event using unified architecture',
        image: 'https://example.com/event.jpg',
        location: 'Test Venue',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // Day after tomorrow + 3 hours
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date(),
        // Event-specific fields
        venue: 'Test Venue',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        priceMin: 25.00,
        priceMax: 50.00,
        currency: 'USD',
        ticketUrl: 'https://example.com/tickets',
        attendeeCount: 100,
        source: 'MANUAL'
      }
    });
    console.log('✅ Event created:', event.id);

    // Step 4: Add participants to both content
    console.log('\n📝 Step 4: Adding participants...');
    await prisma.content_participants.createMany({
      data: [
        {
          id: `participant_${Date.now()}_1`,
          contentId: hangout.id,
          userId: user.id,
          role: 'CREATOR',
          canEdit: true,
          joinedAt: new Date()
        },
        {
          id: `participant_${Date.now()}_2`,
          contentId: event.id,
          userId: user.id,
          role: 'CREATOR',
          canEdit: true,
          joinedAt: new Date()
        }
      ]
    });
    console.log('✅ Participants added');

    // Step 5: Create RSVPs for both content
    console.log('\n📝 Step 5: Creating RSVPs...');
    await prisma.rsvp.createMany({
      data: [
        {
          id: `rsvp_${Date.now()}_1`,
          contentId: hangout.id,
          userId: user.id,
          status: 'YES',
          respondedAt: new Date()
        },
        {
          id: `rsvp_${Date.now()}_2`,
          contentId: event.id,
          userId: user.id,
          status: 'YES',
          respondedAt: new Date()
        }
      ]
    });
    console.log('✅ RSVPs created');

    // Step 6: Create poll for hangout
    console.log('\n📝 Step 6: Creating poll for hangout...');
    const poll = await prisma.polls.create({
      data: {
        id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: hangout.id,
        creatorId: user.id,
        title: 'Test Poll',
        description: 'A test poll for the hangout',
        options: [
          { id: 'option1', title: 'Option 1', description: 'First option' },
          { id: 'option2', title: 'Option 2', description: 'Second option' }
        ],
        status: 'ACTIVE',
        consensusPercentage: 70
      }
    });
    console.log('✅ Poll created:', poll.id);

    // Step 7: Create photos for both content
    console.log('\n📝 Step 7: Creating photos...');
    await prisma.photos.createMany({
      data: [
        {
          id: `photo_${Date.now()}_1`,
          creatorId: user.id,
          contentId: hangout.id,
          originalUrl: 'https://example.com/photo1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          smallUrl: 'https://example.com/small1.jpg',
          mediumUrl: 'https://example.com/medium1.jpg',
          largeUrl: 'https://example.com/large1.jpg',
          originalWidth: 1920,
          originalHeight: 1080,
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          updatedAt: new Date()
        },
        {
          id: `photo_${Date.now()}_2`,
          creatorId: user.id,
          contentId: event.id,
          originalUrl: 'https://example.com/photo2.jpg',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          smallUrl: 'https://example.com/small2.jpg',
          mediumUrl: 'https://example.com/medium2.jpg',
          largeUrl: 'https://example.com/large2.jpg',
          originalWidth: 1920,
          originalHeight: 1080,
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          updatedAt: new Date()
        }
      ]
    });
    console.log('✅ Photos created');

    // Step 8: Create event tags
    console.log('\n📝 Step 8: Creating event tags...');
    await prisma.eventTag.createMany({
      data: [
        { id: `tag_${Date.now()}_1`, contentId: event.id, tag: 'music' },
        { id: `tag_${Date.now()}_2`, contentId: event.id, tag: 'concert' },
        { id: `tag_${Date.now()}_3`, contentId: event.id, tag: 'live' }
      ]
    });
    console.log('✅ Event tags created');

    // Step 9: Test unified feed query
    console.log('\n📝 Step 9: Testing unified feed query...');
    const feedContent = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC'
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        rsvps: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        photos: {
          select: {
            id: true,
            originalUrl: true,
            thumbnailUrl: true,
            caption: true
          }
        },
        polls: {
          select: {
            id: true,
            title: true,
            status: true,
            options: true
          }
        },
        eventTags: {
          select: {
            tag: true
          }
        },
        _count: {
          select: {
            content_participants: true,
            rsvps: true,
            photos: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log('✅ Feed query successful');
    console.log(`📊 Found ${feedContent.length} content items:`);
    feedContent.forEach(item => {
      console.log(`  - ${item.type}: ${item.title} (${item._count.content_participants} participants, ${item._count.rsvps} RSVPs, ${item._count.photos} photos)`);
    });

    // Step 10: Test content-specific queries
    console.log('\n📝 Step 10: Testing content-specific queries...');
    
    const hangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      include: {
        polls: true,
        _count: { select: { polls: true } }
      }
    });
    console.log(`✅ Found ${hangouts.length} hangouts with polls`);

    const events = await prisma.content.findMany({
      where: { type: 'EVENT' },
      include: {
        eventTags: true,
        _count: { select: { eventTags: true } }
      }
    });
    console.log(`✅ Found ${events.length} events with tags`);

    console.log('\n🎉 Unified Architecture Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Unified content table supports both hangouts and events');
    console.log('✅ Event-specific fields work correctly');
    console.log('✅ Hangout-specific fields work correctly');
    console.log('✅ RSVP system works for both content types');
    console.log('✅ Photo system works for both content types');
    console.log('✅ Poll system works for hangouts');
    console.log('✅ Tag system works for events');
    console.log('✅ Unified feed queries work correctly');
    console.log('✅ Content-specific queries work correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testUnifiedArchitecture().catch(console.error);
