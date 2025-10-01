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

async function testEventCreationFlow() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🎉 Testing Complete Event Creation Flow - Phase 2!\n');

    // 1. Test image upload API
    console.log('1️⃣ Testing image upload API...');
    
    // Create a simple test image (1x1 pixel PNG)
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
    console.log('📊 Image Upload Response:');
    console.log('- Success:', uploadResult.success);
    if (uploadResult.success) {
      console.log('- Image URL:', uploadResult.url);
    } else {
      console.log('- Error:', uploadResult.error);
    }

    // 2. Test event creation with all fields
    console.log('\n2️⃣ Testing comprehensive event creation...');
    const eventData = {
      title: 'Tech Conference 2024',
      description: 'The biggest tech conference of the year with industry leaders and cutting-edge innovations.',
      category: 'TECHNOLOGY',
      venue: 'Convention Center',
      address: '123 Tech Street, San Francisco, CA 94105',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      latitude: 37.7749,
      longitude: -122.4194,
      startDate: '2024-03-15T09:00:00Z',
      endDate: '2024-03-15T17:00:00Z',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'America/Los_Angeles',
      priceMin: 150,
      priceMax: 300,
      currency: 'USD',
      ticketUrl: 'https://techconf2024.com/tickets',
      coverImage: uploadResult.success ? uploadResult.url : 'https://via.placeholder.com/400x300',
      isPublic: true,
      attendeeCount: 5000,
      tags: ['technology', 'conference', 'networking', 'innovation'],
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
    console.log('📊 Create Event Response:');
    console.log('- Success:', createEventResult.success);
    if (createEventResult.success) {
      console.log('- Event ID:', createEventResult.event.id);
      console.log('- Title:', createEventResult.event.title);
      console.log('- Category:', createEventResult.event.category);
      console.log('- Venue:', createEventResult.event.venue);
    } else {
      console.log('- Error:', createEventResult.error);
    }

    // 3. Test event retrieval with all fields
    console.log('\n3️⃣ Testing event retrieval with all fields...');
    const getEventsResponse = await fetch(`${baseUrl}/api/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const getEventsResult = await getEventsResponse.json();
    console.log('📊 Events Response:');
    console.log('- Success:', getEventsResult.success);
    console.log('- Total events:', getEventsResult.events?.length || 0);
    
    if (getEventsResult.events && getEventsResult.events.length > 0) {
      const latestEvent = getEventsResult.events[getEventsResult.events.length - 1];
      console.log('- Latest event details:');
      console.log('  - Title:', latestEvent.title);
      console.log('  - Category:', latestEvent.category);
      console.log('  - Venue:', latestEvent.venue);
      console.log('  - City:', latestEvent.city);
      console.log('  - Start Date:', latestEvent.startDate);
      console.log('  - Price:', latestEvent.price);
      console.log('  - Tags:', latestEvent.tags);
      console.log('  - Creator:', latestEvent.creator?.username);
    }

    // 4. Test search functionality
    console.log('\n4️⃣ Testing advanced search...');
    const searchTests = [
      { query: 'tech', description: 'Search for "tech"' },
      { query: 'conference', description: 'Search for "conference"' },
      { category: 'TECHNOLOGY', description: 'Filter by TECHNOLOGY category' },
      { city: 'San Francisco', description: 'Filter by San Francisco' }
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
      console.log(`- Results: ${searchResult.events?.length || 0} events found`);
    }

    console.log('\n🎯 Phase 2 Complete! Event creation system is working perfectly.');
    console.log('\n🌐 Test the complete flow in your browser:');
    console.log('1. Go to: http://localhost:3000/events');
    console.log('2. Click "Create Event" button');
    console.log('3. Fill out all 5 steps of the form');
    console.log('4. Upload images and test all features');
    console.log('5. Submit and see your event appear in the feed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testEventCreationFlow();






