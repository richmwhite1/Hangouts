const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFrontendHangoutCreation() {
  try {
    console.log('🧪 Testing frontend hangout creation workflow...\n');

    // 1. Create a test user (simulating signup)
    const user = await prisma.user.create({
      data: {
        email: `test_frontend_${Date.now()}@example.com`,
        username: `test_frontend_${Date.now()}`,
        name: 'Frontend Test User',
        password: 'hashedpassword',
        avatar: 'https://example.com/avatar.jpg'
      }
    });
    console.log(`✅ Created test user: ${user.username} (${user.id})`);

    // 2. Create a hangout with options (simulating frontend form submission)
    const hangoutData = {
      title: 'Frontend Test Hangout',
      description: 'Testing hangout creation from frontend interface',
      location: 'Test Location, Frontend City',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      privacyLevel: 'PUBLIC',
      maxParticipants: 8,
      weatherEnabled: true,
      image: 'https://example.com/frontend-test-image.jpg',
      creatorId: user.id,
      participants: [], // No additional participants for this test
      mandatoryParticipants: [],
      coHosts: []
    };

    const hangout = await prisma.content.create({
      data: {
        id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'HANGOUT',
        title: hangoutData.title,
        description: hangoutData.description,
        location: hangoutData.location,
        latitude: 34.0522, // Example latitude
        longitude: -118.2437, // Example longitude
        startTime: hangoutData.startTime,
        endTime: hangoutData.endTime,
        status: 'PUBLISHED',
        privacyLevel: hangoutData.privacyLevel,
        image: hangoutData.image,
        creatorId: hangoutData.creatorId,
        updatedAt: new Date(),
        maxParticipants: hangoutData.maxParticipants,
        weatherEnabled: hangoutData.weatherEnabled,
        content_participants: {
          create: {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: hangoutData.creatorId,
            role: 'CREATOR',
            canEdit: true,
            joinedAt: new Date(),
          },
        },
      },
      include: {
        content_participants: true,
      },
    });

    console.log('✅ Hangout created successfully!');
    console.log(`   ID: ${hangout.id}`);
    console.log(`   Title: ${hangout.title}`);
    console.log(`   Type: ${hangout.type}`);
    console.log(`   Max Participants: ${hangout.maxParticipants}`);
    console.log(`   Weather Enabled: ${hangout.weatherEnabled}`);

    // 3. Create a poll with options (simulating poll creation)
    const poll = await prisma.polls.create({
      data: {
        id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId: hangout.id, // Link to content ID
        creatorId: user.id,
        title: 'Where should we go?',
        description: 'Choose your preferred option',
        options: [
          {
            id: `option_${Date.now()}_1`,
            title: 'Option 1: Coffee Shop',
            description: 'Cozy coffee shop downtown',
            location: 'Downtown Coffee Co.',
            dateTime: hangoutData.startTime.toISOString(),
            price: 15,
            eventImage: 'https://example.com/coffee.jpg'
          },
          {
            id: `option_${Date.now()}_2`,
            title: 'Option 2: Park Picnic',
            description: 'Beautiful park with picnic area',
            location: 'Central Park',
            dateTime: hangoutData.startTime.toISOString(),
            price: 0,
            eventImage: 'https://example.com/park.jpg'
          },
          {
            id: `option_${Date.now()}_3`,
            title: 'Option 3: Restaurant',
            description: 'Nice restaurant for dinner',
            location: 'The Bistro',
            dateTime: hangoutData.startTime.toISOString(),
            price: 50,
            eventImage: 'https://example.com/restaurant.jpg'
          }
        ],
        allowMultiple: true,
        isAnonymous: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        consensusPercentage: 70,
        minimumParticipants: 2,
        consensusType: 'percentage',
        status: 'ACTIVE',
        allowDelegation: false,
        allowAbstention: true,
        allowAddOptions: true,
        isPublic: false,
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Poll created successfully!');
    console.log(`   Poll ID: ${poll.id}`);
    console.log(`   Options: ${poll.options.length}`);

    // 4. Create RSVP records for all participants
    const rsvpData = [
      {
        contentId: hangout.id,
        userId: user.id,
        status: 'YES',
        respondedAt: new Date(),
      }
    ];

    await prisma.rsvp.createMany({
      data: rsvpData
    });

    console.log('✅ RSVP records created successfully!');

    // 5. Test API endpoints
    console.log('\n🔍 Testing API endpoints...');
    
    // Test discover page (should show the hangout)
    const discoverResponse = await fetch('http://localhost:3000/api/discover');
    const discoverData = await discoverResponse.json();
    
    if (discoverData.success && discoverData.data.hangouts) {
      const ourHangout = discoverData.data.hangouts.find(h => h.id === hangout.id);
      if (ourHangout) {
        console.log('✅ Discover API shows our hangout');
        console.log(`   Title: ${ourHangout.title}`);
        console.log(`   Image: ${ourHangout.image}`);
        console.log(`   Participants: ${ourHangout._count.participants}`);
      } else {
        console.log('❌ Discover API does not show our hangout');
      }
    } else {
      console.log('❌ Discover API failed:', discoverData);
    }

    // Test hangout detail page
    const detailResponse = await fetch(`http://localhost:3000/api/hangouts/${hangout.id}`);
    const detailData = await detailResponse.json();
    
    if (detailData.success && detailData.hangout) {
      console.log('✅ Hangout detail API works');
      console.log(`   Title: ${detailData.hangout.title}`);
      console.log(`   State: ${detailData.hangout.state}`);
      console.log(`   Requires Voting: ${detailData.hangout.requiresVoting}`);
      console.log(`   Requires RSVP: ${detailData.hangout.requiresRSVP}`);
      console.log(`   Options: ${detailData.hangout.options.length}`);
      console.log(`   RSVPs: ${detailData.hangout.rsvps.length}`);
    } else {
      console.log('❌ Hangout detail API failed:', detailData);
    }

    console.log('\n🎉 Frontend hangout creation test completed successfully!');
    console.log(`\n📱 You can now test the frontend at: http://localhost:3000`);
    console.log(`🔗 Direct hangout link: http://localhost:3000/hangout/${hangout.id}`);

  } catch (error) {
    console.error('❌ Error during frontend hangout creation test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendHangoutCreation();
