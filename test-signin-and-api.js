// Test signin and API functionality
async function testSigninAndAPI() {
  console.log('🔐 Testing signin and API functionality...\n');

  try {
    // Step 1: Sign in to get a valid token
    console.log('1. Signing in to get valid token...');
    const signinResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const signinResult = await signinResponse.json();
    console.log('Signin status:', signinResponse.status);
    console.log('Signin result:', JSON.stringify(signinResult, null, 2));
    console.log('');

    if (!signinResult.data?.token) {
      console.log('❌ No token received from signin');
      return;
    }

    const token = signinResult.data.token;
    console.log('✅ Received token:', token.substring(0, 50) + '...\n');

    // Step 2: Test friends search with valid token
    console.log('2. Testing friends search with valid token...');
    const friendsResponse = await fetch('http://localhost:3000/api/friends/search?q=&limit=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const friendsResult = await friendsResponse.json();
    console.log('Friends search status:', friendsResponse.status);
    console.log('Friends search result:', JSON.stringify(friendsResult, null, 2));
    console.log('');

    // Step 3: Test hangout creation with valid token
    console.log('3. Testing hangout creation with valid token...');
    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Hangout for Bill',
        description: 'Debug test hangout',
        location: 'Test Location',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        privacyLevel: 'PUBLIC',
        type: 'quick_plan',
        options: [{
          title: 'Test Option',
          description: 'Test option description',
          location: 'Test Location',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }]
      })
    });

    const hangoutResult = await hangoutResponse.json();
    console.log('Hangout creation status:', hangoutResponse.status);
    console.log('Hangout creation result:', JSON.stringify(hangoutResult, null, 2));
    console.log('');

    // Step 4: Test discover page with valid token
    console.log('4. Testing discover page with valid token...');
    const discoverResponse = await fetch('http://localhost:3000/api/discover', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const discoverResult = await discoverResponse.json();
    console.log('Discover page status:', discoverResponse.status);
    console.log('Discover page result:', JSON.stringify(discoverResult, null, 2));
    console.log('');

    // Step 5: Test CORS preflight
    console.log('5. Testing CORS preflight...');
    const corsResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log('CORS preflight status:', corsResponse.status);
    console.log('CORS headers:');
    console.log('  Access-Control-Allow-Origin:', corsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('  Access-Control-Allow-Methods:', corsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('  Access-Control-Allow-Headers:', corsResponse.headers.get('Access-Control-Allow-Headers'));
    console.log('  Access-Control-Allow-Credentials:', corsResponse.headers.get('Access-Control-Allow-Credentials'));

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSigninAndAPI();
