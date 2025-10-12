// Test events API to see what's happening
const fetch = require('node-fetch');

async function testEventsAPI() {
  console.log('🧪 Testing Events API...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing /api/events endpoint...');
    const response = await fetch(`${baseUrl}/api/events`);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.events) {
      console.log(`\nFound ${data.events.length} events:`);
      data.events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} (ID: ${event.id})`);
        console.log(`   Creator: ${event.creator?.name || 'Unknown'}`);
        console.log(`   Public: ${event.isPublic}`);
        console.log(`   Created: ${event.createdAt}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error testing events API:', error.message);
  }
}

testEventsAPI();
