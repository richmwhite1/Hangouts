const jwt = require('jsonwebtoken');

// Test complete polling functionality
async function testCompletePolling() {
  console.log('🧪 Testing Complete Polling Functionality');
  
  // Test data
  const hangoutId = 'hangout_1758585614387_1tkfo6rg0';
  const userId = 'cmfq75h2v0000jpf08u3kfi6b'; // bill user
  
  // Try different JWT secrets
  const secrets = [
    'your-secret-key-here-replace-in-production',
    'jwt-secret-key',
    'hangout-secret',
    'development-secret'
  ];
  
  let validToken = null;
  
  // Try to find a working token
  for (const secret of secrets) {
    try {
      const token = jwt.sign(
        { userId, email: 'bill@email.com', username: 'bill' },
        secret,
        { expiresIn: '7d' }
      );
      
      console.log(`🔑 Testing token with secret: ${secret.substring(0, 10)}...`);
      
      // Test the token by calling the hangout API
      const response = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Valid token found!');
        validToken = token;
        break;
      } else {
        console.log(`❌ Token invalid: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error with secret ${secret.substring(0, 10)}...: ${error.message}`);
    }
  }
  
  if (!validToken) {
    console.log('❌ No valid token found. Cannot proceed with test.');
    return;
  }
  
  console.log('🔍 Testing polls API...');
  
  // Test polls API
  try {
    const pollsResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls-simple`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    if (pollsResponse.ok) {
      const pollsData = await pollsResponse.json();
      console.log(`✅ Polls API working! Found ${pollsData.polls?.length || 0} polls`);
      
      if (pollsData.polls && pollsData.polls.length > 0) {
        console.log('📊 Poll details:');
        pollsData.polls.forEach((poll, index) => {
          console.log(`  ${index + 1}. ${poll.title} - ${poll.totalVotes} votes`);
          if (poll.pollOptions) {
            poll.pollOptions.forEach((option, optIndex) => {
              console.log(`     ${optIndex + 1}. ${option.text} (${option.voteCount} votes, ${option.percentage?.toFixed(1)}%)`);
            });
          }
        });
      }
    } else {
      console.log(`❌ Polls API failed: ${pollsResponse.status} - ${await pollsResponse.text()}`);
    }
  } catch (error) {
    console.log(`❌ Error testing polls API: ${error.message}`);
  }
  
  // Test poll creation
  console.log('🔍 Testing poll creation...');
  
  const pollData = {
    title: "Test Poll - Complete System",
    description: "Testing the complete polling system",
    options: [
      {
        text: "Option A",
        description: "First option",
        date: "2025-09-23",
        time: "7:00 PM",
        location: "Test Location A",
        latitude: null,
        longitude: null
      },
      {
        text: "Option B", 
        description: "Second option",
        date: "2025-09-23",
        time: "8:00 PM",
        location: "Test Location B",
        latitude: null,
        longitude: null
      }
    ],
    consensusConfig: {
      consensusType: "PERCENTAGE",
      threshold: 60,
      minParticipants: 2,
      allowTies: false,
      customRules: {}
    },
    allowMultiple: true,
    isAnonymous: false,
    allowDelegation: false,
    allowAbstention: true,
    isPublic: false,
    visibility: "FRIENDS",
    allowAddOptions: true
  };
  
  try {
    const createResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify(pollData)
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Poll created successfully!');
      console.log('📊 Created poll:', createData.poll?.title);
      
      // Test voting on the created poll
      if (createData.poll && createData.options && createData.options.length > 0) {
        console.log('🔍 Testing voting...');
        
        const voteData = {
          optionId: createData.options[0].id,
          voteType: 'SINGLE',
          weight: 1.0
        };
        
        const voteResponse = await fetch(`http://localhost:3000/api/polls/${createData.poll.id}/vote-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`
          },
          body: JSON.stringify(voteData)
        });
        
        if (voteResponse.ok) {
          console.log('✅ Vote cast successfully!');
          
          // Check polls again to see updated vote counts
          const updatedPollsResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls-simple`, {
            headers: { 'Authorization': `Bearer ${validToken}` }
          });
          
          if (updatedPollsResponse.ok) {
            const updatedPollsData = await updatedPollsResponse.json();
            console.log('📊 Updated polls after voting:');
            updatedPollsData.polls.forEach((poll, index) => {
              console.log(`  ${index + 1}. ${poll.title} - ${poll.totalVotes} votes`);
              if (poll.pollOptions) {
                poll.pollOptions.forEach((option, optIndex) => {
                  console.log(`     ${optIndex + 1}. ${option.text} (${option.voteCount} votes, ${option.percentage?.toFixed(1)}%)`);
                });
              }
            });
          }
        } else {
          console.log(`❌ Voting failed: ${voteResponse.status} - ${await voteResponse.text()}`);
        }
      }
    } else {
      const errorText = await createResponse.text();
      console.log(`❌ Poll creation failed: ${createResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Error creating poll: ${error.message}`);
  }
  
  console.log('🏁 Test complete!');
}

testCompletePolling().catch(console.error);








