// Test script to verify friends API endpoints
const fetch = require('node-fetch');

async function testFriendsAPI() {
  console.log('Testing Friends API endpoints...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Search users endpoint (should work without auth for testing)
    console.log('1. Testing /api/users/search endpoint...');
    const searchResponse = await fetch(`${baseUrl}/api/users/search?q=`);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`   Status: ${searchResponse.status}`);
      console.log(`   Users found: ${searchData.users?.length || 0}`);
      if (searchData.users && searchData.users.length > 0) {
        console.log('   Sample users:');
        searchData.users.slice(0, 3).forEach(user => {
          console.log(`     - ${user.name} (@${user.username})`);
        });
      }
    } else {
      console.log(`   Error: ${searchResponse.status} - ${await searchResponse.text()}`);
    }
    
    console.log('');
    
    // Test 2: Friends endpoint (requires auth)
    console.log('2. Testing /api/friends endpoint...');
    const friendsResponse = await fetch(`${baseUrl}/api/friends`);
    
    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      console.log(`   Status: ${friendsResponse.status}`);
      console.log(`   Friends found: ${friendsData.friends?.length || 0}`);
    } else {
      console.log(`   Error: ${friendsResponse.status} - ${await friendsResponse.text()}`);
    }
    
    console.log('');
    
    // Test 3: Friend requests endpoint (requires auth)
    console.log('3. Testing /api/friends/requests endpoint...');
    const requestsResponse = await fetch(`${baseUrl}/api/friends/requests`);
    
    if (requestsResponse.ok) {
      const requestsData = await requestsResponse.json();
      console.log(`   Status: ${requestsResponse.status}`);
      console.log(`   Requests found: ${requestsData.requests?.length || 0}`);
    } else {
      console.log(`   Error: ${requestsResponse.status} - ${await requestsResponse.text()}`);
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('Server is running, proceeding with tests...\n');
      await testFriendsAPI();
    } else {
      console.log('Server health check failed, but proceeding with tests...\n');
      await testFriendsAPI();
    }
  } catch (error) {
    console.log('Server not running or not accessible. Please start the server first.');
    console.log('Run: npm run dev');
  }
}

checkServer();
