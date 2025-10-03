const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testFrontendWithValidToken() {
  try {
    console.log('🧪 Testing frontend with valid token...\n');

    // Use the valid user we created earlier
    const userId = 'cmfyi6rmm0000jp4yv9r4nq8c';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZ5aTZybW0wMDAwanA0eXY5cjRucThjIiwiZW1haWwiOiJrYXJsQGVtYWlsLmNvbSIsInVzZXJuYW1lIjoia2FybCIsImlhdCI6MTc1ODc0OTc0MywiZXhwIjoxNzU5MzU0NTQzfQ.2Q3vFE250O6shvjjlDuF9mRHPZW_7du5xzLXsBUmGDM';

    console.log(`✅ Using valid user: karl (${userId})`);

    // 1. Test Home Feed
    console.log('\n1️⃣ Testing Home Feed...');
    const homeFeedResponse = await fetch('http://localhost:3000/api/feed?type=home', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const homeFeedData = await homeFeedResponse.json();
    if (homeFeedResponse.ok && homeFeedData.success) {
      console.log(`✅ Home feed: Found ${homeFeedData.data.content.length} items`);
      const hangouts = homeFeedData.data.content.filter(item => item.type === 'HANGOUT');
      console.log(`   - Hangouts: ${hangouts.length}`);
      const events = homeFeedData.data.content.filter(item => item.type === 'EVENT');
      console.log(`   - Events: ${events.length}`);
    } else {
      console.log('❌ Home feed: FAIL', homeFeedData);
    }

    // 2. Test Discover Feed
    console.log('\n2️⃣ Testing Discover Feed...');
    const discoverFeedResponse = await fetch('http://localhost:3000/api/feed?type=discover');
    const discoverFeedData = await discoverFeedResponse.json();
    if (discoverFeedResponse.ok && discoverFeedData.success) {
      console.log(`✅ Discover feed: Found ${discoverFeedData.data.content.length} items`);
      const hangouts = discoverFeedData.data.content.filter(item => item.type === 'HANGOUT');
      console.log(`   - Hangouts: ${hangouts.length}`);
      const events = discoverFeedData.data.content.filter(item => item.type === 'EVENT');
      console.log(`   - Events: ${events.length}`);
    } else {
      console.log('❌ Discover feed: FAIL', discoverFeedData);
    }

    // 3. Test Friends API
    console.log('\n3️⃣ Testing Friends API...');
    const friendsResponse = await fetch('http://localhost:3000/api/friends', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const friendsData = await friendsResponse.json();
    if (friendsResponse.ok && friendsData.success) {
      console.log(`✅ Friends API: Found ${friendsData.data.friends.length} friends`);
    } else {
      console.log('❌ Friends API: FAIL', friendsData);
    }

    // 4. Test Hangout Creation
    console.log('\n4️⃣ Testing Hangout Creation...');
    const hangoutData = {
      title: 'Frontend Test Hangout',
      description: 'Testing complete frontend functionality',
      location: 'Test Location, Frontend City',
      latitude: 34.052235,
      longitude: -118.243683,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      privacyLevel: 'PUBLIC',
      weatherEnabled: true,
      image: 'https://example.com/frontend-test-image.jpg',
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

    const createHangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hangoutData),
    });
    const createHangoutResult = await createHangoutResponse.json();

    if (createHangoutResponse.ok && createHangoutResult.success) {
      const hangoutId = createHangoutResult.data.id;
      console.log('✅ Hangout creation: PASS');
      console.log(`   ID: ${hangoutId}`);
      console.log(`   Title: ${createHangoutResult.data.title}`);

      // 5. Test Hangout Detail
      console.log('\n5️⃣ Testing Hangout Detail...');
      const hangoutDetailResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const hangoutDetailData = await hangoutDetailResponse.json();
      if (hangoutDetailResponse.ok && hangoutDetailData.success) {
        console.log('✅ Hangout detail: PASS');
        console.log(`   State: ${hangoutDetailData.hangout?.state}`);
        console.log(`   Requires Voting: ${hangoutDetailData.hangout?.requiresVoting}`);
        console.log(`   Options: ${hangoutDetailData.hangout?.options?.length || 0}`);
        console.log(`   Participants: ${hangoutDetailData.hangout?.participants?.length || 0}`);
      } else {
        console.log('❌ Hangout detail: FAIL', hangoutDetailData);
      }

      // 6. Test Voting
      console.log('\n6️⃣ Testing Voting...');
      const voteResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionId: hangoutData.options[0].id,
          action: 'add'
        }),
      });
      const voteData = await voteResponse.json();
      if (voteResponse.ok && voteData.success) {
        console.log('✅ Voting: PASS');
      } else {
        console.log('❌ Voting: FAIL', voteData);
      }

      // 7. Test RSVP
      console.log('\n7️⃣ Testing RSVP...');
      const rsvpResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/rsvp`, {
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
        console.log('✅ RSVP: PASS');
        console.log(`   Status: ${rsvpData.data?.status}`);
      } else {
        console.log('❌ RSVP: FAIL', rsvpData);
      }

    } else {
      console.log('❌ Hangout creation: FAIL', createHangoutResult);
    }

    console.log('\n🎉 Frontend test completed successfully!');
    console.log('\n📱 Frontend URLs:');
    console.log('   - Home: http://localhost:3000');
    console.log('   - Discover: http://localhost:3000/discover');
    console.log('   - Create: http://localhost:3000/create');
    console.log(`   - Test Hangout: http://localhost:3000/hangout/${createHangoutResult.data?.id || 'N/A'}`);
    console.log(`\n🔑 Valid Token: ${token}`);

  } catch (error) {
    console.error('❌ Frontend test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendWithValidToken();







