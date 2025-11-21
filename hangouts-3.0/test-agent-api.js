// Quick test of the agent API
const axios = require('axios');

async function testAgent() {
  try {
    console.log('Testing agent API...\n');
    
    // First, you need to be signed in and get your auth token
    // This script assumes you're signed in on localhost:3000 or 3004
    
    const response = await axios.post('http://localhost:3004/api/agent/chat', {
      message: 'Find concerts tonight in Salt Lake City'
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail with 401 without a valid Clerk session cookie
        // Run this test from browser console instead, or test via the UI
      },
      timeout: 45000
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAgent();











