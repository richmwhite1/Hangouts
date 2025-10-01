const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

async function runFinalVerification() {
  console.log('🧪 Running final verification test...');

  try {
    // 1. Verify the valid user exists
    const validUser = await prisma.user.findUnique({
      where: { id: 'cmfyi6rmm0000jp4yv9r4nq8c' }
    });

    if (!validUser) {
      console.log('❌ Valid user not found in database');
      return;
    }

    console.log(`✅ Valid user found: ${validUser.username} (${validUser.id})`);

    // 2. Test hangout creation with valid token
    const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZ5aTZybW0wMDAwanA0eXY5cjRucThjIiwiZW1haWwiOiJrYXJsQGVtYWlsLmNvbSIsInVzZXJuYW1lIjoia2FybCIsImlhdCI6MTc1ODc0OTc0MywiZXhwIjoxNzU5MzU0NTQzfQ.2Q3vFE250O6shvjjlDuF9mRHPZW_7du5xzLXsBUmGDM";
    
    const hangoutData = {
      title: 'Final Verification Hangout',
      description: 'This hangout is created during final verification',
      location: 'Test Location',
      latitude: 34.052235,
      longitude: -118.243683,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      privacyLevel: 'PUBLIC',
      weatherEnabled: true,
      image: 'https://example.com/test-hangout-image.jpg',
      type: 'single_option',
      participants: [],
      mandatoryParticipants: [],
      coHosts: [],
    };

    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hangoutData),
    });

    const hangoutResult = await hangoutResponse.json();

    if (hangoutResponse.ok && hangoutResult.success) {
      console.log('✅ Hangout creation: PASS');
      console.log(`   ID: ${hangoutResult.data.id}`);
      console.log(`   Title: ${hangoutResult.data.title}`);
    } else {
      console.log('❌ Hangout creation: FAIL', hangoutResult);
    }

    // 3. Test event creation
    const eventData = {
      title: 'Final Verification Event',
      description: 'This event is created during final verification',
      categories: ['MUSIC'],
      venue: 'Test Venue',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      priceMin: 25,
      currency: 'USD',
      isPublic: true
    };

    const eventResponse = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const eventResult = await eventResponse.json();

    if (eventResponse.ok && eventResult.success) {
      console.log('✅ Event creation: PASS');
      console.log(`   ID: ${eventResult.event.id}`);
      console.log(`   Title: ${eventResult.event.title}`);
    } else {
      console.log('❌ Event creation: FAIL', eventResult);
    }

    // 4. Test home feed
    const homeFeedResponse = await fetch('http://localhost:3000/api/feed?type=home', {
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });

    const homeFeedData = await homeFeedResponse.json();

    if (homeFeedResponse.ok && homeFeedData.success) {
      console.log('✅ Home feed: PASS');
      console.log(`   Found ${homeFeedData.data.content.length} items`);
    } else {
      console.log('❌ Home feed: FAIL', homeFeedData);
    }

    // 5. Test discover feed
    const discoverFeedResponse = await fetch('http://localhost:3000/api/feed?type=discover');

    const discoverFeedData = await discoverFeedResponse.json();

    if (discoverFeedResponse.ok && discoverFeedData.success) {
      console.log('✅ Discover feed: PASS');
      console.log(`   Found ${discoverFeedData.data.content.length} items`);
    } else {
      console.log('❌ Discover feed: FAIL', discoverFeedData);
    }

    console.log('\n🎉 Final verification completed!');
    console.log('\n📱 Next steps:');
    console.log('1. Click the "🚨 FORCE FIX AUTHENTICATION NOW" button in the browser');
    console.log('2. Go back to your main app at http://localhost:3000');
    console.log('3. Refresh the page completely (Ctrl+F5 or Cmd+Shift+R)');
    console.log('4. Try creating hangouts and events - they should work now!');

  } catch (error) {
    console.error('❌ Final verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runFinalVerification();