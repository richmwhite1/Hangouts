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

async function testHangoutCreationDebug() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 DEBUGGING HANGOUT CREATION\n');

    // Test with minimal data first
    const minimalHangoutData = {
      title: 'Debug Test Hangout',
      startTime: '2024-06-01T14:00:00Z',
      endTime: '2024-06-01T16:00:00Z'
    };

    console.log('1️⃣ Testing minimal hangout creation...');
    const minimalResponse = await fetch(`${baseUrl}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(minimalHangoutData)
    });

    const minimalResult = await minimalResponse.json();
    console.log('📊 Minimal Hangout Creation:');
    console.log('- Status:', minimalResponse.status);
    console.log('- Success:', minimalResult.success);
    console.log('- Full Response:', JSON.stringify(minimalResult, null, 2));
    if (minimalResult.success && minimalResult.data) {
      console.log('- Hangout ID:', minimalResult.data.id);
    } else {
      console.log('- Error:', minimalResult.error);
      console.log('- Details:', minimalResult.details);
    }

    // Test with full data
    const fullHangoutData = {
      title: 'Full Debug Test Hangout',
      description: 'Testing with all fields',
      location: 'Test Location',
      latitude: 40.7128,
      longitude: -74.0060,
      startTime: '2024-06-01T14:00:00Z',
      endTime: '2024-06-01T16:00:00Z',
      privacyLevel: 'PUBLIC',
      maxParticipants: 10,
      weatherEnabled: false,
      participants: ['cmfq75h2v0000jpf08u3kfi6b']
    };

    console.log('\n2️⃣ Testing full hangout creation...');
    const fullResponse = await fetch(`${baseUrl}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(fullHangoutData)
    });

    const fullResult = await fullResponse.json();
    console.log('📊 Full Hangout Creation:');
    console.log('- Status:', fullResponse.status);
    console.log('- Success:', fullResult.success);
    console.log('- Full Response:', JSON.stringify(fullResult, null, 2));
    if (fullResult.success && fullResult.data) {
      console.log('- Hangout ID:', fullResult.data.id);
    } else {
      console.log('- Error:', fullResult.error);
      console.log('- Details:', fullResult.details);
    }

    // Test authentication
    console.log('\n3️⃣ Testing authentication...');
    const authResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const authResult = await authResponse.json();
    console.log('📊 Auth Status:');
    console.log('- Status:', authResponse.status);
    console.log('- Success:', authResult.success);
    console.log('- User:', authResult.user?.username || 'N/A');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHangoutCreationDebug();
