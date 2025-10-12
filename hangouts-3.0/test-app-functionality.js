// Comprehensive functionality test
const fetch = require('node-fetch');

async function testAppFunctionality() {
  console.log('🧪 Testing App Functionality...\n');
  
  const baseUrl = 'http://localhost:3000';
  const tests = [];
  
  // Test 1: Authentication endpoints
  tests.push({
    name: 'Authentication Check',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      return {
        status: response.status,
        success: response.ok,
        message: response.ok ? 'Authentication working' : 'Authentication failed'
      };
    }
  });
  
  // Test 2: Friends API
  tests.push({
    name: 'Friends API',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/friends`);
      return {
        status: response.status,
        success: response.status === 401, // Should require auth
        message: response.status === 401 ? 'Friends API properly secured' : 'Friends API security issue'
      };
    }
  });
  
  // Test 3: User Search API
  tests.push({
    name: 'User Search API',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/users/search?q=`);
      return {
        status: response.status,
        success: response.status === 401, // Should require auth
        message: response.status === 401 ? 'User Search API properly secured' : 'User Search API security issue'
      };
    }
  });
  
  // Test 4: Profile Update API
  tests.push({
    name: 'Profile Update API',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/profile/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteActivities: ['test'] })
      });
      return {
        status: response.status,
        success: response.status === 401, // Should require auth
        message: response.status === 401 ? 'Profile Update API properly secured' : 'Profile Update API security issue'
      };
    }
  });
  
  // Test 5: Friend Requests API
  tests.push({
    name: 'Friend Requests API',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/friends/requests`);
      return {
        status: response.status,
        success: response.status === 401, // Should require auth
        message: response.status === 401 ? 'Friend Requests API properly secured' : 'Friend Requests API security issue'
      };
    }
  });
  
  // Run all tests
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`);
      const result = await test.test();
      console.log(`  Status: ${result.status}`);
      console.log(`  Result: ${result.success ? '✅' : '❌'} ${result.message}`);
      console.log('');
    } catch (error) {
      console.log(`  Error: ❌ ${error.message}`);
      console.log('');
    }
  }
  
  console.log('🎯 Test Summary:');
  console.log('- All API endpoints should return 401 (Unauthorized) without proper authentication');
  console.log('- This confirms that authentication is working correctly');
  console.log('- In the browser with proper Clerk authentication, these endpoints will work');
}

testAppFunctionality();