const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testCompleteFrontend() {
  try {
    console.log('🧪 Testing complete frontend functionality...\n');

    // Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    console.log(`✅ Found user: ${user.username} (${user.id})`);

    // Create a JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log(`✅ Generated token: ${token.substring(0, 50)}...`);

    // Test 1: Friends API
    console.log('\n1️⃣ Testing Friends API...');
    const friendsResponse = await fetch('http://localhost:3000/api/friends', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      const friends = friendsData.data?.friends || [];
      console.log(`✅ Friends API: Found ${friends.length} friends`);
      
      if (friends.length >= 5) {
        console.log('✅ Friends count: PASS (≥5 friends)');
      } else {
        console.log(`❌ Friends count: FAIL (only ${friends.length} friends, need ≥5)`);
      }
    } else {
      console.log('❌ Friends API failed');
    }

    // Test 2: Hangout Creation
    console.log('\n2️⃣ Testing Hangout Creation...');
    
    const hangoutData = {
      title: 'Complete Frontend Test Hangout',
      description: 'Testing complete frontend functionality',
      location: 'Test Location, Frontend City',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      privacyLevel: 'PUBLIC',
      maxParticipants: 10,
      weatherEnabled: true,
      image: 'https://example.com/test-image.jpg',
      creatorId: user.id,
      participants: [], // No additional participants for this test
      mandatoryParticipants: [],
      coHosts: [],
      type: 'multi_option',
      options: [
        {
          id: `option_${Date.now()}_1`,
          title: 'Option 1: Coffee Shop',
          description: 'Cozy coffee shop downtown',
          location: 'Downtown Coffee Co.',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 15,
          eventImage: 'https://example.com/coffee.jpg'
        },
        {
          id: `option_${Date.now()}_2`,
          title: 'Option 2: Park Picnic',
          description: 'Beautiful park with picnic area',
          location: 'Central Park',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 0,
          eventImage: 'https://example.com/park.jpg'
        }
      ]
    };

    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(hangoutData)
    });

    if (hangoutResponse.ok) {
      const hangoutResult = await hangoutResponse.json();
      console.log('✅ Hangout creation: PASS');
      console.log(`   ID: ${hangoutResult.data?.id}`);
      console.log(`   Title: ${hangoutResult.data?.title}`);
      
      const hangoutId = hangoutResult.data?.id;
      
      // Test 3: Hangout Detail API
      console.log('\n3️⃣ Testing Hangout Detail API...');
      const detailResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        console.log('✅ Hangout detail API: PASS');
        console.log(`   State: ${detailData.hangout?.state}`);
        console.log(`   Requires Voting: ${detailData.hangout?.requiresVoting}`);
        console.log(`   Options: ${detailData.hangout?.options?.length || 0}`);
        console.log(`   Participants: ${detailData.hangout?.participants?.length || 0}`);
      } else {
        console.log('❌ Hangout detail API: FAIL');
      }

      // Test 4: Home Feed API
      console.log('\n4️⃣ Testing Home Feed API...');
      const homeResponse = await fetch('http://localhost:3000/api/feed?type=home', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (homeResponse.ok) {
        const homeData = await homeResponse.json();
        const hangouts = homeData.data?.hangouts || [];
        console.log(`✅ Home feed API: PASS (${hangouts.length} hangouts)`);
        
        const ourHangout = hangouts.find(h => h.id === hangoutId);
        if (ourHangout) {
          console.log('✅ Our hangout appears in home feed: PASS');
        } else {
          console.log('❌ Our hangout missing from home feed: FAIL');
        }
      } else {
        console.log('❌ Home feed API: FAIL');
      }

      // Test 5: Discover Feed API
      console.log('\n5️⃣ Testing Discover Feed API...');
      const discoverResponse = await fetch('http://localhost:3000/api/feed?type=discover', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (discoverResponse.ok) {
        const discoverData = await discoverResponse.json();
        const hangouts = discoverData.data?.hangouts || [];
        console.log(`✅ Discover feed API: PASS (${hangouts.length} hangouts)`);
        
        const ourHangout = hangouts.find(h => h.id === hangoutId);
        if (ourHangout) {
          console.log('✅ Our hangout appears in discover feed: PASS');
        } else {
          console.log('❌ Our hangout missing from discover feed: FAIL');
        }
      } else {
        console.log('❌ Discover feed API: FAIL');
      }

    } else {
      const errorData = await hangoutResponse.json();
      console.log('❌ Hangout creation: FAIL');
      console.log('   Error:', errorData);
    }

    console.log('\n🎉 Complete frontend test completed!');
    console.log('\n📱 Frontend should be accessible at: http://localhost:3000');
    console.log('🔑 Use this token for authentication:', token);

  } catch (error) {
    console.error('❌ Error during complete frontend test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFrontend();