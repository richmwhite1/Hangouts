const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testFriendsAPI() {
  try {
    console.log('🧪 Testing friends API...\n');

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

    // Test friends API
    const friendsResponse = await fetch('http://localhost:3000/api/friends', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      console.log('✅ Friends API response:', JSON.stringify(friendsData, null, 2));
      
      const friends = friendsData.data?.friends || [];
      console.log(`✅ Found ${friends.length} friends`);
      
      if (friends.length > 0) {
        console.log('👥 Sample friends:');
        friends.slice(0, 3).forEach(friend => {
          console.log(`  - ${friend.username} (${friend.name})`);
        });
      }
    } else {
      const errorData = await friendsResponse.json();
      console.log('❌ Friends API failed:', errorData);
    }

    // Test hangout creation
    console.log('\n🧪 Testing hangout creation...');
    
    const hangoutData = {
      title: 'Test Hangout with Friends',
      description: 'Testing hangout creation with friends',
      location: 'Test Location',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      privacyLevel: 'PUBLIC',
      maxParticipants: 10,
      weatherEnabled: true,
      image: 'https://example.com/test-image.jpg',
      creatorId: user.id,
      participants: [], // No additional participants for this test
      mandatoryParticipants: [],
      coHosts: []
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
      const hangoutData = await hangoutResponse.json();
      console.log('✅ Hangout creation successful!');
      console.log(`   ID: ${hangoutData.data?.id}`);
      console.log(`   Title: ${hangoutData.data?.title}`);
    } else {
      const errorData = await hangoutResponse.json();
      console.log('❌ Hangout creation failed:', errorData);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFriendsAPI();







