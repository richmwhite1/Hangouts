const fetch = require('node-fetch')

async function testJoinFlow() {
  try {
    console.log('🧪 Testing join hangout flow...')
    
    // Test the join API endpoint
    const hangoutId = 'hangout_voting_1760633296140' // Use the test hangout we created earlier
    
    console.log('Testing join API for hangout:', hangoutId)
    
    const joinResponse = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the structure
      }
    })
    
    console.log('Join API response status:', joinResponse.status)
    const joinResult = await joinResponse.text()
    console.log('Join API response:', joinResult.substring(0, 200) + '...')
    
    // Test the sign-in page with redirect parameter
    console.log('\nTesting sign-in page with redirect...')
    const signInResponse = await fetch('http://localhost:3000/signin?redirect_url=' + encodeURIComponent(`http://localhost:3000/hangout/${hangoutId}`))
    console.log('Sign-in page response status:', signInResponse.status)
    
    console.log('🎉 Join flow test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testJoinFlow()
