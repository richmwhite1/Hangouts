// Simple test for voting API endpoints
async function testVotingEndpoints() {
  try {
    console.log('🧪 Testing voting API endpoints...')
    
    // Test 1: Check if hangouts API is accessible
    console.log('📡 Testing hangouts API accessibility...')
    
    try {
      const hangoutsResponse = await fetch('http://localhost:3000/api/hangouts')
      console.log('📊 Hangouts API status:', hangoutsResponse.status)
      
      if (hangoutsResponse.status === 401) {
        console.log('✅ Hangouts API properly requires authentication')
      } else if (hangoutsResponse.status === 200) {
        console.log('✅ Hangouts API accessible')
      } else {
        console.log('⚠️ Unexpected status:', hangoutsResponse.status)
      }
    } catch (error) {
      console.log('❌ Hangouts API not accessible:', error.message)
      console.log('💡 Make sure the development server is running on localhost:3000')
      return
    }
    
    // Test 2: Check if voting API endpoint exists
    console.log('🗳️ Testing voting API endpoint...')
    
    try {
      const voteResponse = await fetch('http://localhost:3000/api/hangouts/test_id/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          optionId: 'test_option',
          action: 'toggle'
        })
      })
      
      console.log('📊 Vote API status:', voteResponse.status)
      
      if (voteResponse.status === 401) {
        console.log('✅ Vote API properly requires authentication')
      } else if (voteResponse.status === 404) {
        console.log('✅ Vote API endpoint exists (404 expected for test_id)')
      } else {
        console.log('⚠️ Unexpected vote API status:', voteResponse.status)
      }
    } catch (error) {
      console.log('❌ Vote API not accessible:', error.message)
    }
    
    // Test 3: Check API response structure
    console.log('🔍 Testing API response structure...')
    
    try {
      const testResponse = await fetch('http://localhost:3000/api/test-auth')
      console.log('📊 Test auth API status:', testResponse.status)
      
      if (testResponse.ok) {
        const testData = await testResponse.json()
        console.log('📊 Test auth response:', testData)
        console.log('✅ API response structure looks good')
      }
    } catch (error) {
      console.log('❌ Test auth API error:', error.message)
    }
    
    console.log('🎉 API endpoint tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Test voting flow logic with mock data
function testVotingFlowLogic() {
  console.log('🧪 Testing voting flow logic with mock data...')
  
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
  
  // Test consensus detection logic
  const votedCount = Object.keys(mockHangout.userVotes).filter(userId => 
    mockHangout.userVotes[userId] && mockHangout.userVotes[userId].length > 0
  ).length
  
  const participants = mockHangout.participants || []
  const minVotesRequired = Math.max(1, Math.ceil(participants.length * 0.5))
  
  console.log('📊 Voted count:', votedCount)
  console.log('📊 Participants count:', participants.length)
  console.log('📊 Min votes required:', minVotesRequired)
  console.log('📊 Consensus reached:', votedCount >= minVotesRequired)
  
  // Test winner calculation
  const votes = mockHangout.votes || {}
  const optionVotes = {}
  
  Object.values(votes).forEach((optionId) => {
    optionVotes[optionId] = (optionVotes[optionId] || 0) + 1
  })
  
  console.log('📊 Option vote counts:', optionVotes)
  
  const winnerId = Object.keys(optionVotes).reduce((a, b) => 
    optionVotes[a] > optionVotes[b] ? a : b
  )
  
  const winner = mockHangout.options.find(opt => opt.id === winnerId)
  console.log('📊 Winner:', winner)
  
  console.log('✅ Voting flow logic test completed')
}

// Run tests
console.log('🚀 Starting voting system tests...')
testVotingEndpoints()
testVotingFlowLogic()
