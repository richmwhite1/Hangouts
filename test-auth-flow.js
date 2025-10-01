const fetch = require('node-fetch');

async function testAuthFlow() {
  console.log('=== Testing Complete Authentication Flow ===\n');

  try {
    // 1. Test login
    console.log('1. Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karl@example.com',
        password: 'Password1!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData.success ? 'SUCCESS' : 'FAILED');
    
    if (!loginData.success) {
      console.log('Login error:', loginData.error);
      return;
    }

    const token = loginData.data.token;
    const userId = loginData.data.user.id;
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('User ID:', userId);

    // 2. Test friends API
    console.log('\n2. Testing friends API...');
    const friendsResponse = await fetch('http://localhost:3000/api/friends', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const friendsData = await friendsResponse.json();
    console.log('Friends response:', friendsData.success ? 'SUCCESS' : 'FAILED');
    
    if (friendsData.success) {
      console.log('Friends count:', friendsData.data.friends?.length || 0);
    } else {
      console.log('Friends error:', friendsData.error);
    }

    // 3. Test hangout creation
    console.log('\n3. Testing hangout creation...');
    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Test Hangout from Script',
        description: 'This is a test hangout created via script.',
        location: 'Script Location',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        type: 'quick_plan',
        privacyLevel: 'PUBLIC',
        requiresRSVP: true,
        options: [{
          title: 'Script Option 1',
          description: 'Description for script option 1',
          location: 'Script Location 1',
          dateTime: new Date().toISOString(),
          price: 10
        }]
      })
    });

    const hangoutData = await hangoutResponse.json();
    console.log('Hangout creation:', hangoutData.success ? 'SUCCESS' : 'FAILED');
    
    if (hangoutData.success) {
      console.log('Hangout ID:', hangoutData.data.id);
    } else {
      console.log('Hangout error:', hangoutData.error);
    }

    // 4. Test conversations API
    console.log('\n4. Testing conversations API...');
    const conversationsResponse = await fetch('http://localhost:3000/api/conversations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const conversationsData = await conversationsResponse.json();
    console.log('Conversations response:', conversationsData.success ? 'SUCCESS' : 'FAILED');
    
    if (conversationsData.success) {
      console.log('Conversations count:', conversationsData.data.conversations?.length || 0);
    } else {
      console.log('Conversations error:', conversationsData.error);
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testAuthFlow();

