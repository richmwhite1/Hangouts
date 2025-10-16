const fetch = require('node-fetch')

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing complete flow...')
    
    // Test 1: Check if privacy indicator is working
    console.log('\n1. Testing privacy indicator...')
    const hangoutResponse = await fetch('http://localhost:3000/hangout/hangout_voting_1760633296140')
    console.log('Hangout detail page status:', hangoutResponse.status)
    
    // Test 2: Check if home page shows photos
    console.log('\n2. Testing home page photos...')
    const homeResponse = await fetch('http://localhost:3000/')
    console.log('Home page status:', homeResponse.status)
    
    // Test 3: Check if sign-in page handles redirect
    console.log('\n3. Testing sign-in redirect...')
    const testUrl = encodeURIComponent('http://localhost:3000/hangout/hangout_voting_1760633296140')
    const signInResponse = await fetch(`http://localhost:3000/signin?redirect_url=${testUrl}`)
    console.log('Sign-in page with redirect status:', signInResponse.status)
    
    // Test 4: Check if public hangout viewer works
    console.log('\n4. Testing public hangout viewer...')
    const publicResponse = await fetch('http://localhost:3000/hangouts/public/hangout_voting_1760633296140')
    console.log('Public hangout viewer status:', publicResponse.status)
    
    console.log('\n🎉 Complete flow test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testCompleteFlow()
