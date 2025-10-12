// Test script to verify friends API with authentication
const fetch = require('node-fetch');

async function testFriendsAPIWithAuth() {
  console.log('Testing Friends API with authentication...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Search users endpoint with auth (should work now)
    console.log('1. Testing /api/users/search endpoint with auth...');
    
    // For testing, we'll use a mock token - in real app this comes from Clerk
    const mockToken = 'test-token';
    
    const searchResponse = await fetch(`${baseUrl}/api/users/search?q=`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });
    
    console.log(`   Status: ${searchResponse.status}`);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`   Users found: ${searchData.users?.length || 0}`);
      if (searchData.users && searchData.users.length > 0) {
        console.log('   Sample users:');
        searchData.users.slice(0, 3).forEach(user => {
          console.log(`     - ${user.name} (@${user.username})`);
        });
      }
    } else {
      const errorText = await searchResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    console.log('');
    
    // Test 2: Friends endpoint with auth
    console.log('2. Testing /api/friends endpoint with auth...');
    const friendsResponse = await fetch(`${baseUrl}/api/friends`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });
    
    console.log(`   Status: ${friendsResponse.status}`);
    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      console.log(`   Friends found: ${friendsData.friends?.length || 0}`);
    } else {
      const errorText = await friendsResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testFriendsAPIWithAuth();
