const fetch = require('node-fetch');

async function testFrontendAuth() {
  console.log('=== Testing Frontend Authentication Flow ===');
  
  try {
    // Step 1: Test login
    console.log('1. Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'karl@example.com',
        password: 'Password1!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success) {
      console.error('Login failed:', loginData);
      return;
    }
    
    const token = loginData.data.token;
    console.log('Token received:', token.substring(0, 50) + '...');
    
    // Step 2: Test friends API
    console.log('\n2. Testing friends API...');
    const friendsResponse = await fetch('http://localhost:3000/api/friends', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const friendsData = await friendsResponse.json();
    console.log('Friends response:', friendsData);
    
    if (friendsData.success) {
      console.log('Friends count:', friendsData.data.friends.length);
      friendsData.data.friends.forEach(friend => {
        console.log(`- ${friend.name} (${friend.username})`);
      });
    }
    
    // Step 3: Test hangout creation
    console.log('\n3. Testing hangout creation...');
    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Frontend Test Hangout',
        description: 'Testing frontend authentication',
        type: 'quick_plan',
        privacyLevel: 'PUBLIC',
        options: [{
          title: 'Test Option',
          description: 'Testing',
          location: 'Test Location',
          dateTime: '2025-01-25T15:00:00Z',
          price: 10,
          hangoutUrl: ''
        }]
      })
    });
    
    const hangoutData = await hangoutResponse.json();
    console.log('Hangout creation response:', hangoutData);
    
    if (hangoutData.success) {
      console.log('✅ Hangout created successfully!');
    } else {
      console.error('❌ Hangout creation failed:', hangoutData);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFrontendAuth();