const jwt = require('jsonwebtoken');

// Generate a valid JWT token for Bill
const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random';
const token = jwt.sign(
  {
    userId: 'cmfq75h2v0000jpf08u3kfi6b',
    email: 'bill@example.com',
    username: 'bill'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);

async function testCompleteFrontendBackend() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 COMPREHENSIVE FRONTEND & BACKEND TESTING\n');

    // 1. Test Events API
    console.log('1️⃣ Testing Events API...');
    const eventsResponse = await fetch(`${baseUrl}/api/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const eventsResult = await eventsResponse.json();
    console.log('📊 Events API:');
    console.log('- Status:', eventsResponse.status);
    console.log('- Success:', eventsResult.success);
    console.log('- Events count:', eventsResult.events?.length || 0);

    // 2. Test Hangouts API
    console.log('\n2️⃣ Testing Hangouts API...');
    const hangoutsResponse = await fetch(`${baseUrl}/api/hangouts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const hangoutsResult = await hangoutsResponse.json();
    console.log('📊 Hangouts API:');
    console.log('- Status:', hangoutsResponse.status);
    console.log('- Success:', hangoutsResult.success);
    console.log('- Hangouts count:', hangoutsResult.hangouts?.length || 0);

    // 3. Test Polls API for a specific hangout
    console.log('\n3️⃣ Testing Polls API...');
    if (hangoutsResult.hangouts && hangoutsResult.hangouts.length > 0) {
      const hangoutId = hangoutsResult.hangouts[0].id;
      const pollsResponse = await fetch(`${baseUrl}/api/hangouts/${hangoutId}/polls-simple`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pollsResult = await pollsResponse.json();
      console.log('📊 Polls API:');
      console.log('- Status:', pollsResponse.status);
      console.log('- Success:', pollsResult.success);
      console.log('- Polls count:', pollsResult.polls?.length || 0);
    }

    // 4. Test Comments API
    console.log('\n4️⃣ Testing Comments API...');
    if (hangoutsResult.hangouts && hangoutsResult.hangouts.length > 0) {
      const hangoutId = hangoutsResult.hangouts[0].id;
      const commentsResponse = await fetch(`${baseUrl}/api/hangouts/${hangoutId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const commentsResult = await commentsResponse.json();
      console.log('📊 Comments API:');
      console.log('- Status:', commentsResponse.status);
      console.log('- Success:', commentsResult.success);
      console.log('- Comments count:', commentsResult.comments?.length || 0);
    }

    // 5. Test Photos API
    console.log('\n5️⃣ Testing Photos API...');
    if (hangoutsResult.hangouts && hangoutsResult.hangouts.length > 0) {
      const hangoutId = hangoutsResult.hangouts[0].id;
      const photosResponse = await fetch(`${baseUrl}/api/hangouts/${hangoutId}/photos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const photosResult = await photosResponse.json();
      console.log('📊 Photos API:');
      console.log('- Status:', photosResponse.status);
      console.log('- Success:', photosResult.success);
      console.log('- Photos count:', photosResult.photos?.length || 0);
    }

    // 6. Test Authentication API
    console.log('\n6️⃣ Testing Authentication API...');
    const authResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const authResult = await authResponse.json();
    console.log('📊 Auth API:');
    console.log('- Status:', authResponse.status);
    console.log('- Success:', authResult.success);
    console.log('- User:', authResult.user?.username || 'N/A');

    // 7. Test Image Upload API
    console.log('\n7️⃣ Testing Image Upload API...');
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    const blob = new Blob([testImageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test-image.png');
    formData.append('type', 'event-cover');

    const uploadResponse = await fetch(`${baseUrl}/api/upload/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    console.log('📊 Image Upload API:');
    console.log('- Status:', uploadResponse.status);
    console.log('- Success:', uploadResult.success);
    if (uploadResult.success) {
      console.log('- Image URL:', uploadResult.url);
    } else {
      console.log('- Error:', uploadResult.error);
    }

    // 8. Test Event Creation with Real Image
    console.log('\n8️⃣ Testing Event Creation with Real Image...');
    const eventData = {
      title: 'Frontend Backend Test Event',
      description: 'Testing the complete frontend and backend integration.',
      category: 'TECHNOLOGY',
      venue: 'Test Venue',
      address: '123 Test Street, Test City, TC 12345',
      city: 'Test City',
      state: 'TC',
      zipCode: '12345',
      latitude: 40.7128,
      longitude: -74.0060,
      startDate: '2024-04-01T10:00:00Z',
      endDate: '2024-04-01T18:00:00Z',
      startTime: '10:00',
      endTime: '18:00',
      timezone: 'America/New_York',
      priceMin: 25,
      priceMax: 50,
      currency: 'USD',
      ticketUrl: 'https://test-event.com/tickets',
      coverImage: 'https://via.placeholder.com/400x300',
      isPublic: true,
      attendeeCount: 100,
      tags: ['test', 'frontend', 'backend', 'integration'],
      additionalImages: []
    };

    const createEventResponse = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    });

    const createEventResult = await createEventResponse.json();
    console.log('📊 Event Creation:');
    console.log('- Status:', createEventResponse.status);
    console.log('- Success:', createEventResult.success);
    if (createEventResult.success) {
      console.log('- Event ID:', createEventResult.event.id);
      console.log('- Title:', createEventResult.event.title);
    } else {
      console.log('- Error:', createEventResult.error);
    }

    // 9. Test Search and Filtering
    console.log('\n9️⃣ Testing Search and Filtering...');
    const searchTests = [
      { query: 'test', description: 'Search for "test"' },
      { query: 'technology', description: 'Search for "technology"' },
      { category: 'TECHNOLOGY', description: 'Filter by TECHNOLOGY' },
      { city: 'Test City', description: 'Filter by Test City' }
    ];

    for (const test of searchTests) {
      const params = new URLSearchParams();
      if (test.query) params.append('search', test.query);
      if (test.category) params.append('category', test.category);
      if (test.city) params.append('city', test.city);

      const searchResponse = await fetch(`${baseUrl}/api/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const searchResult = await searchResponse.json();
      console.log(`📊 ${test.description}:`);
      console.log(`- Status: ${searchResponse.status}`);
      console.log(`- Results: ${searchResult.events?.length || 0} events`);
    }

    console.log('\n🎯 COMPREHENSIVE TEST COMPLETE!');
    console.log('\n🌐 Manual Testing Instructions:');
    console.log('1. Open browser → http://localhost:3000');
    console.log('2. Set localStorage tokens:');
    console.log(`   auth_token: ${token}`);
    console.log('   auth_user: {"id":"cmfq75h2v0000jpf08u3kfi6b","username":"bill","name":"bill","email":"bill@example.com"}');
    console.log('3. Test Events page: http://localhost:3000/events');
    console.log('4. Test Create Event modal and form');
    console.log('5. Test Discover page: http://localhost:3000/discover');
    console.log('6. Test hangout creation and polling');
    console.log('7. Test chat and photo uploads');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCompleteFrontendBackend();






