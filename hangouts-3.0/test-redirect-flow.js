const fetch = require('node-fetch')

async function testRedirectFlow() {
  try {
    console.log('🧪 Testing redirect flow...')
    
    const hangoutId = 'hangout_voting_1760633296140'
    
    // Test 1: Public hangout API should work now
    console.log('\n1. Testing public hangout API...')
    const publicResponse = await fetch(`http://localhost:3000/api/hangouts/public/${hangoutId}`)
    console.log('Public hangout API status:', publicResponse.status)
    
    if (publicResponse.ok) {
      const data = await publicResponse.json()
      console.log('Public hangout data:', data.success ? 'Success' : 'Failed')
    }
    
    // Test 2: Public hangout page should load
    console.log('\n2. Testing public hangout page...')
    const publicPageResponse = await fetch(`http://localhost:3000/hangouts/public/${hangoutId}`)
    console.log('Public hangout page status:', publicPageResponse.status)
    
    // Test 3: Sign-in with redirect should work
    console.log('\n3. Testing sign-in with redirect...')
    const testUrl = encodeURIComponent(`http://localhost:3000/hangouts/public/${hangoutId}`)
    const signInResponse = await fetch(`http://localhost:3000/signin?redirect_url=${testUrl}`)
    console.log('Sign-in page with redirect status:', signInResponse.status)
    
    // Test 4: Authenticated hangout page should work
    console.log('\n4. Testing authenticated hangout page...')
    const authResponse = await fetch(`http://localhost:3000/hangout/${hangoutId}`)
    console.log('Authenticated hangout page status:', authResponse.status)
    
    console.log('\n🎉 Redirect flow test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testRedirectFlow()
