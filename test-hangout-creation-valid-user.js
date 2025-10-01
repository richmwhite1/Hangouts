const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testHangoutCreation() {
  try {
    console.log('🧪 Testing hangout creation with valid user...\n');

    // Use the valid user we just created
    const userId = 'cmfyi6rmm0000jp4yv9r4nq8c';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZ5aTZybW0wMDAwanA0eXY5cjRucThjIiwiZW1haWwiOiJrYXJsQGVtYWlsLmNvbSIsInVzZXJuYW1lIjoia2FybCIsImlhdCI6MTc1ODc0OTc0MywiZXhwIjoxNzU5MzU0NTQzfQ.2Q3vFE250O6shvjjlDuF9mRHPZW_7du5xzLXsBUmGDM';

    console.log(`✅ Using user ID: ${userId}`);

    // Test hangout creation
    const hangoutData = {
      title: 'Valid User Hangout Test',
      description: 'Testing hangout creation with valid user ID',
      location: 'Test Location, Valid City',
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
      participants: [],
      mandatoryParticipants: [],
      coHosts: [],
    };

    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hangoutData),
    });

    if (hangoutResponse.ok) {
      const hangoutResult = await hangoutResponse.json();
      console.log('✅ Hangout creation: PASS');
      console.log(`   ID: ${hangoutResult.data?.id}`);
      console.log(`   Title: ${hangoutResult.data?.title}`);
    } else {
      const errorData = await hangoutResponse.json();
      console.log('❌ Hangout creation: FAIL');
      console.log('   Error:', errorData);
    }

    console.log('\n🎉 Hangout creation test completed!');

  } catch (error) {
    console.error('❌ Error during hangout creation test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHangoutCreation();




