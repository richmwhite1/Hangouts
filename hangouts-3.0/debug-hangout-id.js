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

async function debugHangoutId() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Debugging Hangout ID Issue...\n');

    // 1. Create a hangout
    console.log('1️⃣ Creating hangout...');
    const hangoutResponse = await fetch(`${baseUrl}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Debug Poll Test',
        description: 'Testing poll display debugging',
        location: 'Test Location',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        privacyLevel: 'FRIENDS_ONLY',
        allowFriendsToInvite: true
      })
    });

    const hangoutResult = await hangoutResponse.json();
    if (!hangoutResult.success) {
      throw new Error(`Hangout creation failed: ${hangoutResult.error}`);
    }

    const hangoutId = hangoutResult.data?.id;
    console.log('✅ Hangout created with ID:', hangoutId);

    // 2. Check hangout details
    console.log('\n2️⃣ Checking hangout details...');
    const hangoutDetailResponse = await fetch(`${baseUrl}/api/hangouts/${hangoutId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const hangoutDetail = await hangoutDetailResponse.json();
    console.log('📊 Hangout detail response:');
    console.log('- Success:', hangoutDetail.success);
    console.log('- Hangout ID:', hangoutDetail.hangout?.id);
    console.log('- Hangout Details ID:', hangoutDetail.hangout?.hangout_details?.id);

    // 3. Create a poll
    console.log('\n3️⃣ Creating poll...');
    const pollResponse = await fetch(`${baseUrl}/api/hangouts/${hangoutId}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: "Debug Poll",
        description: "Testing poll creation",
        options: [
          {
            text: "Option 1",
            description: "First option",
            date: "2024-01-25",
            time: "7:00 PM",
            location: "Test Location 1",
            latitude: 40.7128,
            longitude: -74.0060
          },
          {
            text: "Option 2",
            description: "Second option",
            date: "2024-01-25",
            time: "8:00 PM",
            location: "Test Location 2",
            latitude: 40.7589,
            longitude: -73.9851
          }
        ],
        consensusConfig: {
          consensusType: 'PERCENTAGE',
          threshold: 60,
          minParticipants: 2,
          allowTies: false
        }
      })
    });

    const pollResult = await pollResponse.json();
    console.log('📊 Poll creation response:');
    console.log('- Success:', pollResult.success);
    if (pollResult.success) {
      console.log('- Poll ID:', pollResult.poll?.id);
      console.log('- Hangout ID in poll:', pollResult.poll?.hangoutId);
    } else {
      console.log('- Error:', pollResult.error);
    }

    // 4. Test polls-simple API
    console.log('\n4️⃣ Testing polls-simple API...');
    const pollsResponse = await fetch(`${baseUrl}/api/hangouts/${hangoutId}/polls-simple`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const pollsResult = await pollsResponse.json();
    console.log('📊 Polls-simple response:');
    console.log('- Success:', pollsResult.success);
    console.log('- Polls count:', pollsResult.polls?.length || 0);
    if (pollsResult.polls && pollsResult.polls.length > 0) {
      console.log('- First poll ID:', pollsResult.polls[0].id);
      console.log('- First poll title:', pollsResult.polls[0].title);
      console.log('- First poll isActive:', pollsResult.polls[0].isActive);
    }

    // 5. Provide the hangout URL for testing
    console.log('\n🌐 Test this hangout in your browser:');
    console.log(`http://localhost:3000/hangouts/${hangoutId}`);
    console.log('\n🔑 Make sure you have this token in localStorage:');
    console.log(token);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugHangoutId();














