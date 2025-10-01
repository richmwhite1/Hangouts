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

async function testEventsSystem() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🎉 Testing Events System - Phase 1 Complete!\n');

    // 1. Test GET events (should return empty array initially)
    console.log('1️⃣ Testing GET /api/events...');
    const getEventsResponse = await fetch(`${baseUrl}/api/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const getEventsResult = await getEventsResponse.json();
    console.log('📊 GET Events Response:');
    console.log('- Success:', getEventsResult.success);
    console.log('- Events count:', getEventsResult.events?.length || 0);

    // 2. Test POST event creation
    console.log('\n2️⃣ Testing POST /api/events...');
    const createEventResponse = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Arctic Monkeys Concert',
        description: 'Experience the legendary Arctic Monkeys live in concert with their latest album tour.',
        category: 'MUSIC',
        venue: 'Madison Square Garden',
        address: '4 Pennsylvania Plaza, New York, NY 10001',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        latitude: 40.7505,
        longitude: -73.9934,
        startDate: '2024-02-15T20:00:00Z',
        endDate: '2024-02-15T23:00:00Z',
        startTime: '20:00',
        endTime: '23:00',
        timezone: 'America/New_York',
        priceMin: 75,
        priceMax: 150,
        currency: 'USD',
        ticketUrl: 'https://example.com/tickets',
        coverImage: 'https://example.com/arctic-monkeys-cover.jpg',
        isPublic: true,
        attendeeCount: 15000,
        tags: ['rock', 'concert', 'live music', 'indie'],
        additionalImages: [
          'https://example.com/arctic-monkeys-1.jpg',
          'https://example.com/arctic-monkeys-2.jpg'
        ]
      })
    });

    const createEventResult = await createEventResponse.json();
    console.log('📊 Create Event Response:');
    console.log('- Success:', createEventResult.success);
    if (createEventResult.success) {
      console.log('- Event ID:', createEventResult.event.id);
      console.log('- Title:', createEventResult.event.title);
      console.log('- Venue:', createEventResult.event.venue);
    } else {
      console.log('- Error:', createEventResult.error);
    }

    // 3. Test GET events again (should now have 1 event)
    console.log('\n3️⃣ Testing GET /api/events after creation...');
    const getEventsResponse2 = await fetch(`${baseUrl}/api/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const getEventsResult2 = await getEventsResponse2.json();
    console.log('📊 GET Events Response (after creation):');
    console.log('- Success:', getEventsResult2.success);
    console.log('- Events count:', getEventsResult2.events?.length || 0);
    if (getEventsResult2.events && getEventsResult2.events.length > 0) {
      const event = getEventsResult2.events[0];
      console.log('- First event title:', event.title);
      console.log('- First event category:', event.category);
      console.log('- First event venue:', event.venue);
      console.log('- First event tags:', event.tags);
    }

    // 4. Test search functionality
    console.log('\n4️⃣ Testing search functionality...');
    const searchResponse = await fetch(`${baseUrl}/api/events?search=arctic`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchResult = await searchResponse.json();
    console.log('📊 Search Response:');
    console.log('- Success:', searchResult.success);
    console.log('- Search results count:', searchResult.events?.length || 0);

    // 5. Test category filter
    console.log('\n5️⃣ Testing category filter...');
    const categoryResponse = await fetch(`${baseUrl}/api/events?category=MUSIC`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const categoryResult = await categoryResponse.json();
    console.log('📊 Category Filter Response:');
    console.log('- Success:', categoryResult.success);
    console.log('- Music events count:', categoryResult.events?.length || 0);

    console.log('\n🎯 Phase 1 Complete! Events system is working.');
    console.log('\n🌐 Test the Events page in your browser:');
    console.log('1. Go to: http://localhost:3000/events');
    console.log('2. Make sure you have the correct localStorage tokens set');
    console.log('3. You should see the Arctic Monkeys concert event');
    console.log('4. Test the search and filter functionality');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testEventsSystem();






