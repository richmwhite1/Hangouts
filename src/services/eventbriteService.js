// Use environment variable with fallback to hardcoded token
const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN || 'FHIC42DDFDUOJIGRKK7W';
const EVENTBRITE_API_KEY = process.env.VITE_EVENTBRITE_API_KEY || 'R7XYGDBXRHYAO3DVFZ';
const EVENTBRITE_CLIENT_SECRET = process.env.VITE_EVENTBRITE_CLIENT_SECRET || 'BRCG2C6HFTE4D74KOIGBEKUEQUM37E5JH4MX7YT2OA45JWYQZP';
const EVENTBRITE_PUBLIC_TOKEN = process.env.VITE_EVENTBRITE_PUBLIC_TOKEN || '5OM7SU37UN4NUFXJWPQW';
const EVENTBRITE_API_BASE = 'https://api.eventbrite.com/v3';

// Verify this is the REAL service (not mock)
console.log('🔧 Using REAL Eventbrite API');
console.log('🔑 Private Token:', EVENTBRITE_TOKEN ? 'Yes' : 'No');
console.log('🔑 API Key:', EVENTBRITE_API_KEY ? 'Yes' : 'No');
console.log('🔑 Public Token:', EVENTBRITE_PUBLIC_TOKEN ? 'Yes' : 'No');

// NOTE: The Eventbrite API v3 events search endpoint has been deprecated
// We're implementing a real API approach: try real API only, no fallback to mock data
// This provides real events from Eventbrite API

// Mock data removed - using real Eventbrite API only

// API delay function removed - using real API only

// Fetch events for Salt Lake City (real API only)
export const fetchSaltLakeEvents = async () => {
  try {
    console.log('🌐 Searching for all public events in Salt Lake City area...');
    
    // Calculate date range for next 3 months
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    
    const startDate = now.toISOString();
    const endDate = threeMonthsFromNow.toISOString();
    
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    
    // Search for all public events in Salt Lake City area
    const searchUrl = `${EVENTBRITE_API_BASE}/events/search/?` + 
      `location.address=Salt+Lake+City%2C+UT&` +
      `location.within=25mi&` +
      `start_date.range_start=${encodeURIComponent(startDate)}&` +
      `start_date.range_end=${encodeURIComponent(endDate)}&` +
      `status=live&` +
      `expand=venue,category,ticket_availability&` +
      `page_size=50`;
    
    console.log(`🔍 Search URL: ${searchUrl}`);
    
    const eventsResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error(`❌ API Error: ${eventsResponse.status} ${eventsResponse.statusText}`);
      console.error(`❌ Error details: ${errorText}`);
      throw new Error(`Failed to search events: ${eventsResponse.status} ${eventsResponse.statusText}`);
    }
    
    const responseText = await eventsResponse.text();
    console.log(`📄 Response preview: ${responseText.substring(0, 200)}...`);
    
    let eventsData;
    try {
      eventsData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ JSON Parse Error: ${parseError.message}`);
      console.error(`❌ Response was: ${responseText.substring(0, 500)}...`);
      throw new Error(`Invalid JSON response from Eventbrite API`);
    }
    console.log(`✅ Successfully found ${eventsData.events?.length || 0} public events in Salt Lake City area`);
    
    if (eventsData.pagination) {
      console.log(`📄 Pagination info: ${eventsData.pagination.object_count} total events available`);
    }
    
    return eventsData.events || [];
    
  } catch (error) {
    console.error('❌ Error searching Eventbrite events:', error);
    throw new Error(`Eventbrite search error: ${error.message}`);
  }
};

// Transform Eventbrite event to our schema
export const transformEventbriteEvent = (eventbriteEvent) => {
  return {
    // Basic Info
    title: eventbriteEvent.name?.text || 'Untitled Event',
    description: eventbriteEvent.description?.text || '',
    
    // Location
    venue: eventbriteEvent.venue?.name || 'TBA',
    address: eventbriteEvent.venue?.address?.localized_address_display || '',
    city: eventbriteEvent.venue?.address?.city || 'Salt Lake City',
    state: eventbriteEvent.venue?.address?.region || 'UT',
    zipCode: eventbriteEvent.venue?.address?.postal_code || '',
    latitude: eventbriteEvent.venue?.latitude ? parseFloat(eventbriteEvent.venue.latitude) : null,
    longitude: eventbriteEvent.venue?.longitude ? parseFloat(eventbriteEvent.venue.longitude) : null,
    
    // Timing
    startTime: eventbriteEvent.start?.local || new Date().toISOString(),
    endTime: eventbriteEvent.end?.local || null,
    timezone: eventbriteEvent.start?.timezone || 'America/Denver',
    
    // Pricing
    priceMin: eventbriteEvent.ticket_availability?.minimum_ticket_price?.major_value || 0,
    priceMax: eventbriteEvent.ticket_availability?.maximum_ticket_price?.major_value || null,
    currency: 'USD',
    ticketUrl: eventbriteEvent.url,
    
    // Media
    image: eventbriteEvent.logo?.url || eventbriteEvent.logo?.original?.url || null,
    
    // Metadata
    category: mapEventbriteCategory(eventbriteEvent.category?.name),
    tags: extractTags(eventbriteEvent),
    externalEventId: eventbriteEvent.id,
    source: 'EVENTBRITE',
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    
    // Timestamps
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Map Eventbrite categories to our categories
const mapEventbriteCategory = (eventbriteCategory) => {
  const categoryMap = {
    'Music': 'MUSIC',
    'Food & Drink': 'FOOD_DRINK',
    'Sports & Fitness': 'SPORTS_FITNESS',
    'Arts & Culture': 'ARTS_CULTURE',
    'Science & Technology': 'TECHNOLOGY',
    'Business & Professional': 'BUSINESS',
    'Health & Wellness': 'HEALTH_WELLNESS',
    'Education': 'EDUCATION',
    'Travel & Outdoor': 'TRAVEL_OUTDOOR',
    'Fashion & Beauty': 'FASHION_BEAUTY',
    'Home & Garden': 'HOME_GARDEN',
    'Auto, Boat & Air': 'AUTO_BOAT_AIR',
    'Charity & Causes': 'CHARITY_CAUSES',
    'Government & Politics': 'GOVERNMENT_POLITICS',
    'Religion & Spirituality': 'RELIGION_SPIRITUALITY',
    'Community': 'COMMUNITY',
    'Family & Education': 'FAMILY_EDUCATION',
    'Holiday': 'HOLIDAY',
    'Seasonal': 'SEASONAL',
    'Other': 'OTHER'
  };
  
  return categoryMap[eventbriteCategory] || 'OTHER';
};

// Extract tags from event data
const extractTags = (eventbriteEvent) => {
  const tags = [];
  
  // Add category as tag
  if (eventbriteEvent.category?.name) {
    tags.push(eventbriteEvent.category.name.toLowerCase().replace(/\s+/g, '_'));
  }
  
  // Add venue type as tag
  if (eventbriteEvent.venue?.name) {
    const venue = eventbriteEvent.venue.name.toLowerCase();
    if (venue.includes('arena') || venue.includes('stadium')) tags.push('sports_venue');
    if (venue.includes('theater') || venue.includes('theatre')) tags.push('theater');
    if (venue.includes('park')) tags.push('outdoor');
    if (venue.includes('convention') || venue.includes('center')) tags.push('convention');
  }
  
  // Add price range as tag
  const minPrice = eventbriteEvent.ticket_availability?.minimum_ticket_price?.major_value || 0;
  if (minPrice === 0) tags.push('free');
  else if (minPrice < 25) tags.push('budget_friendly');
  else if (minPrice < 50) tags.push('moderate');
  else tags.push('premium');
  
  // Remove duplicates
  return [...new Set(tags)];
};

// Fetch with pagination (real API only)
export const fetchAllSaltLakeEvents = async (maxPages = 5) => {
  console.log('🔄 Starting Eventbrite import from Salt Lake City with pagination...');
  
  try {
    const allEvents = [];
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage <= maxPages) {
      console.log(`📄 Fetching page ${currentPage}...`);
      
      // Calculate date range for next 3 months
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(now.getMonth() + 3);
      
      const startDate = now.toISOString();
      const endDate = threeMonthsFromNow.toISOString();
      
      // Search for events with pagination
      const searchUrl = `${EVENTBRITE_API_BASE}/events/search/?` + 
        `location.address=Salt+Lake+City%2C+UT&` +
        `location.within=25mi&` +
        `start_date.range_start=${encodeURIComponent(startDate)}&` +
        `start_date.range_end=${encodeURIComponent(endDate)}&` +
        `status=live&` +
        `expand=venue,category,ticket_availability&` +
        `page_size=50&` +
        `page=${currentPage}`;
      
      const eventsResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text();
        console.error(`❌ API Error on page ${currentPage}: ${eventsResponse.status} ${eventsResponse.statusText}`);
        console.error(`❌ Error details: ${errorText}`);
        throw new Error(`Failed to search events on page ${currentPage}: ${eventsResponse.status} ${eventsResponse.statusText}`);
      }
      
      const eventsData = await eventsResponse.json();
      const pageEvents = eventsData.events || [];
      
      console.log(`✅ Page ${currentPage}: Found ${pageEvents.length} events`);
      allEvents.push(...pageEvents);
      
      // Check if there are more pages
      if (eventsData.pagination) {
        hasMorePages = eventsData.pagination.has_more_items || false;
        console.log(`📄 Pagination: ${eventsData.pagination.object_count} total events, has more: ${hasMorePages}`);
      } else {
        hasMorePages = false;
      }
      
      currentPage++;
      
      // Add a small delay between requests to be respectful to the API
      if (hasMorePages && currentPage <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`📥 Successfully fetched ${allEvents.length} total events from Eventbrite API across ${currentPage - 1} pages`);
    return allEvents;
    
  } catch (error) {
    console.error('❌ Error in fetchAllSaltLakeEvents:', error);
    throw error;
  }
};