const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testHangoutCreationFix() {
  try {
    console.log('🧪 Testing hangout creation fix...\n');

    // Get a valid user
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

    // Test hangout creation with valid user
    console.log('\n1️⃣ Testing hangout creation with valid user...');
    
    const hangoutData = {
      title: 'Fixed Hangout Creation Test',
      description: 'Testing hangout creation with valid user ID',
      location: 'Test Location, Fixed City',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      privacyLevel: 'PUBLIC',
      maxParticipants: 10,
      weatherEnabled: true,
      image: 'https://example.com/test-image.jpg',
      creatorId: user.id, // Use valid user ID
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
      
      // Test hangout detail API
      console.log('\n2️⃣ Testing hangout detail API...');
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

    } else {
      const errorData = await hangoutResponse.json();
      console.log('❌ Hangout creation: FAIL');
      console.log('   Error:', errorData);
    }

    console.log('\n🎉 Hangout creation fix test completed!');
    console.log(`\n🔑 Use this token for frontend authentication: ${token}`);

  } catch (error) {
    console.error('❌ Error during hangout creation fix test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHangoutCreationFix();




