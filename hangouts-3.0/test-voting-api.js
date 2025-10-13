// Test the voting API endpoint directly
async function testVotingAPI() {
  try {
    console.log('🧪 Testing voting API endpoint...')
    
    // First, let's create a test hangout via the API
    console.log('📝 Creating test hangout...')
    
    const hangoutData = {
      title: 'API Test Voting Hangout',
      description: 'Testing voting via API',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      options: [
        {
          id: 'api_option1',
          title: 'API Option 1',
          description: 'First API option',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'api_option2', 
          title: 'API Option 2',
          description: 'Second API option',
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'api_option3',
          title: 'API Option 3', 
          description: 'Third API option',
          dateTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
    
    // Create hangout
    const createResponse = await fetch('http://localhost:3000/api/hangouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'd need a valid Clerk token here
        // For now, we'll test the structure
      },
      body: JSON.stringify(hangoutData)
    })
    
    console.log('📊 Create hangout response status:', createResponse.status)
    
    if (createResponse.status === 401) {
      console.log('⚠️ Authentication required - this is expected without a valid token')
      console.log('✅ API endpoint is properly protected')
      return
    }
    
    const createData = await createResponse.json()
    console.log('📊 Create hangout response:', createData)
    
    if (createResponse.ok && createData.success) {
      const hangoutId = createData.data.id
      console.log('✅ Hangout created successfully:', hangoutId)
      
      // Test voting API
      console.log('🗳️ Testing voting API...')
      
      const voteData = {
        optionId: 'api_option1',
        action: 'toggle'
      }
      
      const voteResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In a real test, you'd need a valid Clerk token here
        },
        body: JSON.stringify(voteData)
      })
      
      console.log('📊 Vote response status:', voteResponse.status)
      
      if (voteResponse.status === 401) {
        console.log('⚠️ Authentication required for voting - this is expected')
        console.log('✅ Voting API is properly protected')
      } else {
        const voteResult = await voteResponse.json()
        console.log('📊 Vote response:', voteResult)
        
        if (voteResponse.ok) {
          console.log('✅ Vote cast successfully!')
          console.log('📊 Vote finalized:', voteResult.data?.finalized)
          console.log('📊 Vote state:', voteResult.data?.state)
        } else {
          console.log('❌ Vote failed:', voteResult.error)
        }
      }
    } else {
      console.log('❌ Hangout creation failed:', createData.error)
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message)
  }
}

// Test the voting flow logic
function testVotingFlowLogic() {
  console.log('🧪 Testing voting flow logic...')
  
  // Import the hangout flow functions
  const { checkAndFinalizeIfReady, calculateWinner } = require('./src/lib/hangout-flow.ts')
  
  // Mock hangout data
  const mockHangout = {
    userVotes: {
      'user1': ['option1', 'option2'],
      'user2': ['option1'],
      'user3': ['option2', 'option3']
    },
    participants: [
      { id: 'user1', name: 'User 1' },
      { id: 'user2', name: 'User 2' },
      { id: 'user3', name: 'User 3' }
    ],
    options: [
      { id: 'option1', title: 'Option 1' },
      { id: 'option2', title: 'Option 2' },
      { id: 'option3', title: 'Option 3' }
    ],
    votes: {
      'user1': 'option1', // First vote counts for consensus
      'user2': 'option1',
      'user3': 'option2'
    }
  }
  
  console.log('📊 Mock hangout data:', JSON.stringify(mockHangout, null, 2))
  
  // Test consensus detection
  const consensusReached = checkAndFinalizeIfReady(mockHangout)
  console.log('📊 Consensus reached:', consensusReached)
  
  if (consensusReached) {
    // Test winner calculation
    const winner = calculateWinner(mockHangout)
    console.log('📊 Winner:', winner)
  }
  
  console.log('✅ Voting flow logic test completed')
}

// Run tests
console.log('🚀 Starting voting API tests...')
testVotingAPI()
testVotingFlowLogic()
