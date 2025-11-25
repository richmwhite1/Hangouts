const https = require('https');

async function testHangoutAPI() {
  const hangoutId = 'hangout_1763432808196_ur71pj2uw';
  const url = `https://plans.up.railway.app/api/hangouts/${hangoutId}`;
  
  console.log('🔍 Testing hangout API endpoint...');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Script'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 500) {
      console.log('🚨 500 Error detected - this matches the browser error');
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error);
  }
}

testHangoutAPI();
