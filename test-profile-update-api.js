// Test script to verify profile update API with authentication
const fetch = require('node-fetch');

async function testProfileUpdateAPI() {
  console.log('Testing Profile Update API...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Profile update without auth (should fail)
    console.log('1. Testing profile update without authentication...');
    const responseNoAuth = await fetch(`${baseUrl}/api/profile/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        favoriteActivities: ['Test Activity'],
        favoritePlaces: ['Test Place']
      })
    });
    
    console.log(`   Status: ${responseNoAuth.status}`);
    if (responseNoAuth.status === 401) {
      console.log('   ✅ Correctly rejected without authentication');
    } else {
      const errorText = await responseNoAuth.text();
      console.log(`   ❌ Unexpected response: ${errorText}`);
    }
    
    console.log('');
    
    // Test 2: Profile update with mock auth (should also fail but differently)
    console.log('2. Testing profile update with mock authentication...');
    const responseMockAuth = await fetch(`${baseUrl}/api/profile/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify({
        favoriteActivities: ['Test Activity'],
        favoritePlaces: ['Test Place']
      })
    });
    
    console.log(`   Status: ${responseMockAuth.status}`);
    const errorText = await responseMockAuth.text();
    console.log(`   Response: ${errorText}`);
    
    if (responseMockAuth.status === 401) {
      console.log('   ✅ Correctly rejected invalid token');
    } else {
      console.log('   ❌ Unexpected response');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testProfileUpdateAPI();
