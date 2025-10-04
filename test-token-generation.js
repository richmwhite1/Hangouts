// Test token generation using the app's own functions
const { generateToken } = require('./dist/lib/auth');

async function testTokenGeneration() {
  console.log('🔑 Testing token generation...\n');

  try {
    // Generate token using the app's function
    const token = generateToken({
      userId: 'cmgcoh9qu0000jpaifwzbr0zb',
      email: 'richard@example.com',
      username: 'richard'
    });

    console.log('Generated token:', token);
    console.log('Token length:', token.length);
    console.log('');

    // Test the token by making a request
    console.log('Testing token with friends search...');
    const response = await fetch('http://localhost:3000/api/friends/search?q=&limit=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTokenGeneration();
