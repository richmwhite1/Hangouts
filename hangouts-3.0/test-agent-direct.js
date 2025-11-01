// Direct test of Perplexity API to see what it returns
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function testPerplexity() {
  if (!PERPLEXITY_API_KEY) {
    console.error('❌ PERPLEXITY_API_KEY not set!');
    return;
  }

  console.log('🔑 Key found, length:', PERPLEXITY_API_KEY.length);
  console.log('🔑 Key starts with:', PERPLEXITY_API_KEY.substring(0, 10));
  
  const prompt = `Search for real-time events matching: "concerts" in "Salt Lake City".

Search these sources:
- Meetup.com (search: "concerts Salt Lake City")
- Eventbrite.com (search: "concerts Salt Lake City")
- Local event calendars and venue websites
- Concert halls, theaters, and entertainment venues

CRITICAL INSTRUCTIONS:
1. Find 3-6 REAL events from actual sources (Meetup, Eventbrite, local venues)
2. Include actual URLs from the source websites
3. Return ONLY valid JSON - no conversational text, no markdown, no explanations
4. Use this EXACT format:

[
  {
    "title": "Exact event name from source",
    "venue": "Venue name",
    "date": "Day, Month DD, YYYY",
    "time": "H:MM PM",
    "price": "$X-$Y" or "Free",
    "url": "https://actual-eventbrite-or-meetup-url.com",
    "description": "Brief description from event page",
    "image": "https://image-url.jpg" or null
  }
]

RESPOND WITH ONLY THE JSON ARRAY. No text before or after. Real events only.`;

  try {
    console.log('\n🌐 Calling Perplexity API...');
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a JSON API that returns real-time event data. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    console.log('\n📝 Response length:', content.length);
    console.log('\n📄 Full response:');
    console.log(content);
    console.log('\n---\n');
    
    // Try to extract JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const events = JSON.parse(jsonMatch[0]);
        console.log(`✅ Extracted ${events.length} events:`);
        console.log(JSON.stringify(events, null, 2));
      } catch (e) {
        console.error('❌ Failed to parse JSON:', e.message);
      }
    } else {
      console.warn('⚠️  No JSON array found in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testPerplexity();

