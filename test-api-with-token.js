const jwt = require('jsonwebtoken');

// Use the same JWT secret as the app
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-here-make-it-long-and-random";

// Generate a valid JWT token for Bill
function generateToken(userId, username, name, email) {
  return jwt.sign({ 
    userId, 
    username, 
    name, 
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  }, JWT_SECRET, { 
    expiresIn: '1h',
    issuer: 'hangouts-app',
    audience: 'hangouts-users'
  });
}

async function testAPIWithToken() {
  console.log('🧪 Testing API with valid token...\n');

  // Generate token for Bill (from the database debug)
  const billToken = generateToken(
    'cmgcoh9qu0000jpaifwzbr0zb', // Richard's ID from debug
    'richard',
    'Richard White',
    'richard@example.com'
  );

  console.log('Generated token for Richard:', billToken.substring(0, 50) + '...\n');

  try {
    // Test 1: Friends search
    console.log('1. Testing friends search...');
    const friendsResponse = await fetch('http://localhost:3000/api/friends/search?q=&limit=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${billToken}`,
        'Content-Type': 'application/json'
      }
    });

    const friendsResult = await friendsResponse.json();
    console.log('Friends search status:', friendsResponse.status);
    console.log('Friends search result:', JSON.stringify(friendsResult, null, 2));
    console.log('');

    // Test 2: Hangout creation
    console.log('2. Testing hangout creation...');
    const hangoutResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${billToken}`,
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

    // Test 3: Discover page
    console.log('3. Testing discover page...');
    const discoverResponse = await fetch('http://localhost:3000/api/discover', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${billToken}`,
        'Content-Type': 'application/json'
      }
    });

    const discoverResult = await discoverResponse.json();
    console.log('Discover page status:', discoverResponse.status);
    console.log('Discover page result:', JSON.stringify(discoverResult, null, 2));
    console.log('');

    // Test 4: CORS preflight
    console.log('4. Testing CORS preflight...');
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

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPIWithToken();















