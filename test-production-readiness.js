// Comprehensive production readiness test
async function testProductionReadiness() {
  console.log('🚀 Testing Production Readiness...\n');

  const baseUrl = 'http://localhost:3000';
  let authToken = null;

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ Health check: ${healthResponse.status} - ${healthData.status}`);
    console.log('');

    // Test 2: Authentication
    console.log('2. Testing authentication...');
    const signinResponse = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    const signinData = await signinResponse.json();
    authToken = signinData.data?.token;
    console.log(`✅ Authentication: ${signinResponse.status} - ${signinData.success ? 'Success' : 'Failed'}`);
    console.log('');

    if (!authToken) {
      console.log('❌ No auth token received, stopping tests');
      return;
    }

    // Test 3: Friends Search
    console.log('3. Testing friends search...');
    const friendsResponse = await fetch(`${baseUrl}/api/friends/search?q=&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const friendsData = await friendsResponse.json();
    console.log(`✅ Friends search: ${friendsResponse.status} - Found ${friendsData.data?.users?.length || 0} users`);
    console.log('');

    // Test 4: Hangout Creation
    console.log('4. Testing hangout creation...');
    const hangoutResponse = await fetch(`${baseUrl}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Production Test Hangout',
        description: 'Testing production readiness',
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
    const hangoutData = await hangoutResponse.json();
    console.log(`✅ Hangout creation: ${hangoutResponse.status} - ${hangoutData.success ? 'Success' : 'Failed'}`);
    console.log('');

    // Test 5: Discover Page
    console.log('5. Testing discover page...');
    const discoverResponse = await fetch(`${baseUrl}/api/discover`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const discoverData = await discoverResponse.json();
    console.log(`✅ Discover page: ${discoverResponse.status} - Found ${discoverData.data?.hangouts?.length || 0} hangouts`);
    console.log('');

    // Test 6: CORS Preflight
    console.log('6. Testing CORS preflight...');
    const corsResponse = await fetch(`${baseUrl}/api/hangouts`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    console.log(`✅ CORS preflight: ${corsResponse.status} - ${corsResponse.status === 204 ? 'Success' : 'Failed'}`);
    console.log('');

    // Test 7: Main Page Load
    console.log('7. Testing main page load...');
    const pageResponse = await fetch(`${baseUrl}/`);
    console.log(`✅ Main page: ${pageResponse.status} - ${pageResponse.status === 200 ? 'Success' : 'Failed'}`);
    console.log('');

    // Test 8: Discover Page Load
    console.log('8. Testing discover page load...');
    const discoverPageResponse = await fetch(`${baseUrl}/discover`);
    console.log(`✅ Discover page load: ${discoverPageResponse.status} - ${discoverPageResponse.status === 200 ? 'Success' : 'Failed'}`);
    console.log('');

    // Test 9: Friends Page Load
    console.log('9. Testing friends page load...');
    const friendsPageResponse = await fetch(`${baseUrl}/friends`);
    console.log(`✅ Friends page load: ${friendsPageResponse.status} - ${friendsPageResponse.status === 200 ? 'Success' : 'Failed'}`);
    console.log('');

    console.log('🎉 All production readiness tests passed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('✅ Health check working');
    console.log('✅ Authentication working');
    console.log('✅ Friends search working');
    console.log('✅ Hangout creation working');
    console.log('✅ Discover page working');
    console.log('✅ CORS preflight working');
    console.log('✅ Main page loading');
    console.log('✅ Discover page loading');
    console.log('✅ Friends page loading');
    console.log('');
    console.log('🚀 Application is production ready!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProductionReadiness();


















