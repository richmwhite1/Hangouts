// Test real Eventbrite API connection
const EVENTBRITE_TOKEN = 'FHIC42DDFDUOJIGRKK7W';
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

async function testRealEventbriteAPI() {
  try {
    console.log('🔄 Testing REAL Eventbrite API connection...');
    console.log('🔧 Using token:', EVENTBRITE_TOKEN.substring(0, 8) + '...');
    
    // Try different endpoints to find working one
    const endpoints = [
      '/users/me/',
      '/organizations/',
      '/categories/',
      '/events/search/?location.address=Salt Lake City, UT&location.within=5mi&page_size=5',
      '/events/?location.address=Salt Lake City, UT&location.within=5mi&page_size=5',
      '/events/?q=Salt Lake City&page_size=5',
      '/events/?page_size=5',
      '/organizations/me/events/',
      '/users/me/events/'
    ];

    let data = null;
    let workingEndpoint = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Trying endpoint: ${endpoint}`);
        const response = await fetch(`${EVENTBRITE_API_BASE}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${EVENTBRITE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          data = await response.json();
          workingEndpoint = endpoint;
          console.log(`✅ Success with endpoint: ${endpoint}`);
          break;
        } else {
          const errorData = await response.json();
          console.log(`❌ Failed with ${response.status}: ${errorData.error_description || errorData.error}`);
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }

    if (!data) {
      throw new Error('All endpoints failed');
    }
    
    console.log('✅ API Connection successful!');
    console.log(`📊 Found ${data.events?.length || 0} events`);
    console.log(`📄 Pagination: has_more_items = ${data.pagination?.has_more_items}`);
    
    if (data.events && data.events.length > 0) {
      console.log('\n📅 Sample Events:');
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.name?.text}`);
        console.log(`   Venue: ${event.venue?.name || 'TBA'}`);
        console.log(`   Date: ${event.start?.local}`);
        console.log(`   Category: ${event.category?.name}`);
        console.log(`   Price: $${event.ticket_availability?.minimum_ticket_price?.major_value || 'Free'}`);
        console.log(`   Image: ${event.logo?.url ? 'Yes' : 'No'}`);
        console.log(`   URL: ${event.url}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    throw error;
  }
}

// Run the test
testRealEventbriteAPI()
  .then(() => {
    console.log('\n🎉 Real Eventbrite API test completed successfully!');
    console.log('🚀 Ready to import real events!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
