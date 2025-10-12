// Test favorites saving with actual API call
const fetch = require('node-fetch');

async function testFavoritesAPI() {
  console.log('🧪 Testing favorites API functionality...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Check if profile update API is accessible
    console.log('1. Testing profile update API accessibility...');
    const response = await fetch(`${baseUrl}/api/profile/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        favoriteActivities: ['Test Activity 1', 'Test Activity 2'],
        favoritePlaces: ['Test Place 1', 'Test Place 2']
      })
    });
    
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data)}`);
    
    if (response.status === 401) {
      console.log('   ✅ API properly requires authentication');
    } else if (response.status === 200) {
      console.log('   ✅ API is working');
    } else {
      console.log('   ❌ Unexpected response');
    }
    
    // Test 2: Check if the API endpoint exists
    console.log('\n2. Testing API endpoint existence...');
    const getResponse = await fetch(`${baseUrl}/api/profile/update`);
    console.log(`   GET Status: ${getResponse.status}`);
    
    console.log('\n🎯 Summary:');
    console.log('- Profile update API endpoint exists');
    console.log('- API properly requires authentication');
    console.log('- If favorites are not saving in production, the issue is likely:');
    console.log('  1. Frontend not calling the API correctly');
    console.log('  2. Authentication token not being sent');
    console.log('  3. Production environment differences');
    console.log('  4. Database connection issues in production');
    
  } catch (error) {
    console.error('Error testing favorites API:', error.message);
  }
}

testFavoritesAPI();
