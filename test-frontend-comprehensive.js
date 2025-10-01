const jwt = require('jsonwebtoken');

const JWT_SECRET = "your-super-secret-jwt-key-here-make-it-long-and-random";

// Generate a valid JWT token for Bill
function generateToken(userId, username, name, avatar) {
  return jwt.sign({ userId, username, name, avatar }, JWT_SECRET, { expiresIn: '1h' });
}

async function testFrontendComprehensive() {
  console.log('🧪 Comprehensive Frontend Test...');

  // Generate token for Bill
  const billUserId = "cmfq75h2v0000jpf08u3kfi6b";
  const billUsername = "bill";
  const billName = "bill";
  const billAvatar = "/uploads/images/profile_cmfq75h2v0000jpf08u3kfi6b_1758391755838.webp";
  
  const token = generateToken(billUserId, billUsername, billName, billAvatar);
  console.log('✅ Generated token for Bill');

  const hangoutId = "hangout_1758250598719_ti4p2nlxr";

  // Test 1: Hangout API
  console.log('\n1️⃣ Testing Hangout API...');
  try {
    const response = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Hangout API works');
      console.log('📊 Hangout title:', data.hangout?.title || data.title);
      console.log('📊 Hangout participants:', data.hangout?.participants?.length || data.participants?.length || 0);
    } else {
      console.error('❌ Hangout API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Hangout API error:', error.message);
  }

  // Test 2: Polls API
  console.log('\n2️⃣ Testing Polls API...');
  try {
    const response = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls-simple`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Polls API works');
      console.log('📊 Number of polls:', data.polls?.length || 0);
      if (data.polls && data.polls.length > 0) {
        console.log('📊 Latest poll:', data.polls[0].title);
        console.log('📊 Poll options:', data.polls[0].options?.length || 0);
      }
    } else {
      console.error('❌ Polls API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Polls API error:', error.message);
  }

  // Test 3: Comments API
  console.log('\n3️⃣ Testing Comments API...');
  try {
    const response = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/comments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Comments API works');
      console.log('📊 Number of comments:', data.comments?.length || 0);
    } else {
      console.error('❌ Comments API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Comments API error:', error.message);
  }

  // Test 4: Test Poll Creation
  console.log('\n4️⃣ Testing Poll Creation...');
  try {
    const pollPayload = {
      title: "Frontend Test Poll",
      description: "Testing poll creation from frontend test",
      options: [{"text": "Option A"}, {"text": "Option B"}],
      allowMultiple: false,
      isAnonymous: false,
      consensusConfig: {
        consensusType: "PERCENTAGE",
        threshold: 60,
        minParticipants: 2,
        allowTies: false
      },
      allowDelegation: false,
      allowAbstention: true,
      isPublic: false
    };

    const response = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(pollPayload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Poll creation works');
      console.log('📊 Created poll ID:', data.poll?.id);
    } else {
      const errorText = await response.text();
      console.error('❌ Poll creation failed:', response.status, response.statusText);
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Poll creation error:', error.message);
  }

  // Test 5: Test Voting
  console.log('\n5️⃣ Testing Voting...');
  try {
    // First get the latest poll
    const pollsResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls-simple`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (pollsResponse.ok) {
      const pollsData = await pollsResponse.json();
      const latestPoll = pollsData.polls?.[0];
      
      if (latestPoll && latestPoll.options && latestPoll.options.length > 0) {
        const optionId = latestPoll.options[0].id;
        
        const voteResponse = await fetch(`http://localhost:3000/api/polls/${latestPoll.id}/vote-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            optionId: optionId,
            voteType: 'SINGLE',
            weight: 1.0
          })
        });

        if (voteResponse.ok) {
          console.log('✅ Voting works');
        } else {
          const errorText = await voteResponse.text();
          console.error('❌ Voting failed:', voteResponse.status, voteResponse.statusText);
          console.error('Error details:', errorText);
        }
      } else {
        console.log('⚠️ No polls with options found for voting test');
      }
    }
  } catch (error) {
    console.error('❌ Voting error:', error.message);
  }

  console.log('\n🎉 Comprehensive frontend test completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Open browser and navigate to: http://localhost:3000');
  console.log('   2. Sign in as Bill (or create a new account)');
  console.log('   3. Navigate to the hangout: http://localhost:3000/hangouts/hangout_1758250598719_ti4p2nlxr');
  console.log('   4. Check browser console for any JavaScript errors');
  console.log('   5. Verify the simplified UI is working (primary photo, tabs, poll display, voting, etc.)');
}

testFrontendComprehensive();






