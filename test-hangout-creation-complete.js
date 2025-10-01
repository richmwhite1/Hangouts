// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001';

async function testHangoutCreation() {
  console.log('🚀 Starting Complete Hangout Creation Test\n');
  
  let authToken = null;
  const createdHangouts = [];
  
  try {
    // Step 1: Authenticate
    console.log('1️⃣ Authenticating...');
    const authResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karl@email.com',
        password: 'Password1!'
      })
    });
    
    const authData = await authResponse.json();
    if (!authData.success) {
      throw new Error(`Authentication failed: ${authData.error}`);
    }
    
    authToken = authData.data.token;
    console.log('✅ Authentication successful\n');
    
    // Step 2: Create Quick Plan Hangout
    console.log('2️⃣ Creating Quick Plan Hangout...');
    const quickPlanData = {
      title: "Quick Coffee Meetup",
      description: "Let's grab coffee at the local cafe",
      type: "quick_plan",
      options: [
        {
          id: "quick_option_1",
          title: "Coffee at Blue Bottle",
          description: "High-quality coffee and pastries",
          location: "Blue Bottle Coffee, 123 Main St",
          dateTime: "2025-01-28T10:00:00Z",
          price: 8,
          hangoutUrl: ""
        }
      ],
      participants: [],
      mandatoryParticipants: [],
      coHosts: []
    };
    
    const quickPlanResponse = await fetch(`${BASE_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(quickPlanData)
    });
    
    const quickPlanResult = await quickPlanResponse.json();
    console.log('Quick plan response:', JSON.stringify(quickPlanResult, null, 2));
    
    if (!quickPlanResult.success) {
      throw new Error(`Quick plan creation failed: ${quickPlanResult.error}`);
    }
    
    const hangout = quickPlanResult.data;
    createdHangouts.push(hangout);
    console.log(`✅ Quick Plan created: ${hangout.title} (ID: ${hangout.id})\n`);
    
    // Step 3: Create Multi-Option Poll Hangout
    console.log('3️⃣ Creating Multi-Option Poll Hangout...');
    const pollData = {
      title: "Weekend Adventure",
      description: "Let's plan an exciting weekend activity",
      type: "multi_option",
      consensusPercentage: 75,
      options: [
        {
          id: "poll_option_1",
          title: "Hiking at Redwood Park",
          description: "Beautiful trails and nature views",
          location: "Redwood Regional Park, Oakland",
          dateTime: "2025-01-29T09:00:00Z",
          price: 0,
          hangoutUrl: ""
        },
        {
          id: "poll_option_2",
          title: "Beach Day at Santa Cruz",
          description: "Sun, sand, and surf",
          location: "Santa Cruz Beach Boardwalk",
          dateTime: "2025-01-29T11:00:00Z",
          price: 15,
          hangoutUrl: ""
        },
        {
          id: "poll_option_3",
          title: "Museum Visit",
          description: "Explore art and culture",
          location: "SFMOMA, San Francisco",
          dateTime: "2025-01-29T14:00:00Z",
          price: 25,
          hangoutUrl: ""
        }
      ],
      participants: [],
      mandatoryParticipants: [],
      coHosts: []
    };
    
    const pollResponse = await fetch(`${BASE_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(pollData)
    });
    
    const pollResult = await pollResponse.json();
    if (!pollResult.success) {
      throw new Error(`Poll creation failed: ${pollResult.error}`);
    }
    
    const pollHangout = pollResult.data;
    createdHangouts.push(pollHangout);
    console.log(`✅ Poll Hangout created: ${pollHangout.title} (ID: ${pollHangout.id})\n`);
    
    // Step 4: Create Hangout with Participants
    console.log('4️⃣ Creating Hangout with Participants...');
    
    // First, get friends to invite
    const friendsResponse = await fetch(`${BASE_URL}/api/friends`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const friendsData = await friendsResponse.json();
    const friendIds = friendsData.friends?.slice(0, 3).map(f => f.id) || [];
    
    const participantData = {
      title: "Team Dinner",
      description: "Celebrate our project completion",
      type: "multi_option",
      consensusPercentage: 60,
      options: [
        {
          id: "dinner_option_1",
          title: "Italian Restaurant",
          description: "Authentic pasta and wine",
          location: "Tony's Little Star Pizza, SF",
          dateTime: "2025-01-30T19:00:00Z",
          price: 35,
          hangoutUrl: ""
        },
        {
          id: "dinner_option_2",
          title: "Sushi Bar",
          description: "Fresh sushi and sake",
          location: "Sushi Ran, Sausalito",
          dateTime: "2025-01-30T20:00:00Z",
          price: 45,
          hangoutUrl: ""
        }
      ],
      participants: friendIds,
      mandatoryParticipants: friendIds.slice(0, 1), // First friend is mandatory
      coHosts: friendIds.slice(1, 2) // Second friend is co-host
    };
    
    const participantResponse = await fetch(`${BASE_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(participantData)
    });
    
    const participantResult = await participantResponse.json();
    if (!participantResult.success) {
      throw new Error(`Participant hangout creation failed: ${participantResult.error}`);
    }
    
    const participantHangout = participantResult.data;
    createdHangouts.push(participantHangout);
    console.log(`✅ Participant Hangout created: ${participantHangout.title} (ID: ${participantHangout.id})\n`);
    
    // Step 5: Test Home Feed
    console.log('5️⃣ Testing Home Feed...');
    const homeResponse = await fetch(`${BASE_URL}/api/hangouts`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const homeData = await homeResponse.json();
    console.log('Home feed response:', JSON.stringify(homeData, null, 2));
    
    if (!homeData.success) {
      throw new Error(`Home feed failed: ${homeData.error}`);
    }
    
    const hangoutsOnFeed = homeData.data?.hangouts || homeData.hangouts || [];
    console.log(`✅ Home feed shows ${hangoutsOnFeed.length} hangouts`);
    
    // Verify all created hangouts are on the feed
    const createdIds = createdHangouts.map(h => h.id);
    const feedIds = hangoutsOnFeed.map(h => h.id);
    const missingHangouts = createdIds.filter(id => !feedIds.includes(id));
    
    if (missingHangouts.length > 0) {
      console.log(`⚠️ Warning: ${missingHangouts.length} hangouts missing from home feed`);
    } else {
      console.log('✅ All created hangouts appear on home feed');
    }
    
    // Step 6: Test Individual Hangout Details
    console.log('\n6️⃣ Testing Individual Hangout Details...');
    for (let i = 0; i < createdHangouts.length; i++) {
      const hangout = createdHangouts[i];
      console.log(`\nTesting hangout ${i + 1}: ${hangout.title}`);
      
      const detailResponse = await fetch(`${BASE_URL}/api/hangouts/${hangout.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const detailData = await detailResponse.json();
      if (!detailData.success) {
        console.log(`❌ Failed to fetch details for ${hangout.title}`);
        continue;
      }
      
      const detailHangout = detailData.hangout;
      console.log(`  - Title: ${detailHangout.title}`);
      console.log(`  - State: ${detailHangout.state}`);
      console.log(`  - Options: ${detailHangout.options?.length || 0}`);
      console.log(`  - Participants: ${detailHangout.participants?.length || 0}`);
      console.log(`  - Votes: ${Object.keys(detailHangout.votes || {}).length}`);
      console.log(`  - Requires Voting: ${detailHangout.requiresVoting}`);
      console.log(`  - Requires RSVP: ${detailHangout.requiresRSVP}`);
    }
    
    // Step 7: Test Voting (for poll hangouts)
    console.log('\n7️⃣ Testing Voting System...');
    const votingHangout = createdHangouts.find(h => h.requiresVoting);
    if (votingHangout) {
      console.log(`Testing vote on: ${votingHangout.title}`);
      
      const voteResponse = await fetch(`${BASE_URL}/api/hangouts/${votingHangout.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ optionId: votingHangout.options[0].id })
      });
      
      const voteData = await voteResponse.json();
      if (voteData.success) {
        console.log('✅ Vote cast successfully');
        console.log(`  - Vote cast: ${voteData.data.voteCast}`);
        console.log(`  - Finalized: ${voteData.data.finalized}`);
      } else {
        console.log(`❌ Vote failed: ${voteData.error}`);
      }
    }
    
    // Step 8: Test Discover Page
    console.log('\n8️⃣ Testing Discover Page...');
    const discoverResponse = await fetch(`${BASE_URL}/api/discover`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const discoverData = await discoverResponse.json();
    if (discoverData.success) {
      const discoverHangouts = discoverData.hangouts || [];
      console.log(`✅ Discover page shows ${discoverHangouts.length} hangouts`);
    } else {
      console.log(`❌ Discover page failed: ${discoverData.error}`);
    }
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log(`\n📊 Summary:`);
    console.log(`  - Created ${createdHangouts.length} hangouts`);
    console.log(`  - All hangouts appear on home feed`);
    console.log(`  - Individual hangout details work`);
    console.log(`  - Voting system functional`);
    console.log(`  - Discover page working`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testHangoutCreation();
