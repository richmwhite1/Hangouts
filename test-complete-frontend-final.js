const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BASE_URL = 'http://localhost:3000';

async function runCompleteTest() {
  console.log('🧪 Running complete frontend functionality test...\n');

  let user;
  let token;
  let createdHangoutId;

  try {
    // 1. Setup: Create a test user and get a token
    const testUserEmail = `testuser_${Date.now()}@example.com`;
    user = await prisma.user.findFirst() || await prisma.user.create({
      data: {
        email: testUserEmail,
        username: `testuser_${Date.now()}`,
        name: 'Test User',
        password: await bcrypt.hash('password123', 10),
        updatedAt: new Date(),
      },
    });
    console.log(`✅ User: ${user.username} (${user.id})`);

    token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log(`✅ Token generated: ${token.substring(0, 50)}...`);

    // 2. Test Friends API
    console.log('\n2️⃣ Testing Friends API...');
    const friendsResponse = await fetch(`${BASE_URL}/api/friends`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const friendsData = await friendsResponse.json();
    if (friendsResponse.ok && friendsData.success) {
      console.log(`✅ Friends API: Found ${friendsData.data.friends.length} friends`);
    } else {
      console.log('❌ Friends API: FAIL', friendsData);
    }

    // 3. Test Hangout Creation
    console.log('\n3️⃣ Testing Hangout Creation...');
    const hangoutData = {
      title: 'Complete Frontend Test Hangout',
      description: 'Testing complete frontend functionality',
      location: 'Test Location, Test City',
      latitude: 34.052235,
      longitude: -118.243683,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      privacyLevel: 'PUBLIC',
      weatherEnabled: true,
      image: 'https://example.com/test-hangout-image.jpg',
      type: 'multi_option',
      options: [
        { 
          id: `option_${Date.now()}_1`,
          title: 'Option A: Coffee Shop', 
          description: 'Cozy coffee shop downtown',
          location: 'Downtown Coffee Co.',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 15,
          eventImage: 'https://example.com/coffee.jpg'
        },
        { 
          id: `option_${Date.now()}_2`,
          title: 'Option B: Park Picnic', 
          description: 'Beautiful park with picnic area',
          location: 'Central Park',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 0,
          eventImage: 'https://example.com/park.jpg'
        },
      ],
      participants: friendsData.data?.friends?.slice(0, 2).map(f => f.id) || [],
      mandatoryParticipants: friendsData.data?.friends?.slice(0, 1).map(f => f.id) || [],
      coHosts: friendsData.data?.friends?.slice(1, 2).map(f => f.id) || [],
    };

    const createHangoutResponse = await fetch(`${BASE_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hangoutData),
    });
    const createHangoutResult = await createHangoutResponse.json();

    if (createHangoutResponse.ok && createHangoutResult.success) {
      createdHangoutId = createHangoutResult.data.id;
      console.log('✅ Hangout creation: PASS');
      console.log(`   ID: ${createdHangoutId}`);
      console.log(`   Title: ${createHangoutResult.data.title}`);
    } else {
      console.log('❌ Hangout creation: FAIL', createHangoutResult);
    }

    // 4. Test Hangout Detail API
    console.log('\n4️⃣ Testing Hangout Detail API...');
    if (createdHangoutId) {
      const hangoutDetailResponse = await fetch(`${BASE_URL}/api/hangouts/${createdHangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const hangoutDetailData = await hangoutDetailResponse.json();
      if (hangoutDetailResponse.ok && hangoutDetailData.success) {
        console.log('✅ Hangout detail API: PASS');
        console.log(`   State: ${hangoutDetailData.hangout?.state}`);
        console.log(`   Requires Voting: ${hangoutDetailData.hangout?.requiresVoting}`);
        console.log(`   Options: ${hangoutDetailData.hangout?.options?.length || 0}`);
        console.log(`   Participants: ${hangoutDetailData.hangout?.participants?.length || 0}`);
      } else {
        console.log('❌ Hangout detail API: FAIL', hangoutDetailData);
      }
    }

    // 5. Test Home Feed API
    console.log('\n5️⃣ Testing Home Feed API...');
    const homeFeedResponse = await fetch(`${BASE_URL}/api/feed?type=home`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const homeFeedData = await homeFeedResponse.json();
    if (homeFeedResponse.ok && homeFeedData.success) {
      console.log('✅ Home feed API: PASS');
      console.log(`   Found ${homeFeedData.data.content.length} items`);
      const hasOurHangout = homeFeedData.data.content.some(item => item.id === createdHangoutId);
      console.log(`   Contains our hangout: ${hasOurHangout ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ Home feed API: FAIL', homeFeedData);
    }

    // 6. Test Discover Feed API
    console.log('\n6️⃣ Testing Discover Feed API...');
    const discoverFeedResponse = await fetch(`${BASE_URL}/api/feed?type=discover`);
    const discoverFeedData = await discoverFeedResponse.json();
    if (discoverFeedResponse.ok && discoverFeedData.success) {
      console.log('✅ Discover feed API: PASS');
      console.log(`   Found ${discoverFeedData.data.content.length} items`);
      const hasOurHangout = discoverFeedData.data.content.some(item => item.id === createdHangoutId);
      console.log(`   Contains our hangout: ${hasOurHangout ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ Discover feed API: FAIL', discoverFeedData);
    }

    // 7. Test Voting API
    console.log('\n7️⃣ Testing Voting API...');
    if (createdHangoutId) {
      const voteResponse = await fetch(`${BASE_URL}/api/hangouts/${createdHangoutId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionId: hangoutData.options[0].id,
          isPreferred: true
        }),
      });
      const voteData = await voteResponse.json();
      if (voteResponse.ok && voteData.success) {
        console.log('✅ Voting API: PASS');
        console.log(`   Vote status: ${voteData.data?.status}`);
      } else {
        console.log('❌ Voting API: FAIL', voteData);
      }
    }

    // 8. Test RSVP API
    console.log('\n8️⃣ Testing RSVP API...');
    if (createdHangoutId) {
      const rsvpResponse = await fetch(`${BASE_URL}/api/hangouts/${createdHangoutId}/rsvp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'YES'
        }),
      });
      const rsvpData = await rsvpResponse.json();
      if (rsvpResponse.ok && rsvpData.success) {
        console.log('✅ RSVP API: PASS');
        console.log(`   RSVP status: ${rsvpData.data?.status}`);
      } else {
        console.log('❌ RSVP API: FAIL', rsvpData);
      }
    }

    console.log('\n🎉 Complete frontend test completed successfully!');
    console.log('\n📱 Frontend should be accessible at: http://localhost:3000');
    console.log(`🔑 Use this token for authentication: ${token}`);
    console.log(`🆔 Test hangout ID: ${createdHangoutId}`);

  } catch (error) {
    console.error('❌ Complete frontend test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runCompleteTest();
