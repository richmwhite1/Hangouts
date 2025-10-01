#!/usr/bin/env node

const jwt = require('jsonwebtoken')

const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random'
const BASE_URL = 'http://localhost:3000'

// Use existing user from database
const existingUser = {
  id: 'cmfq75h2v0000jpf08u3kfi6b', // Bill's ID from the database
  email: 'bill@email.com',
  username: 'bill',
  name: 'Bill'
}

function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return { success: response.ok, status: response.status, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function testSimplifiedFrontend() {
  console.log('🧪 Testing Simplified Frontend...\n')

  const token = generateToken(existingUser)
  console.log('👤 Using existing user:', existingUser.name)

  // Test 1: Check if hangout page loads
  console.log('\n1️⃣ Testing hangout page load...')
  const hangoutResponse = await makeRequest(`${BASE_URL}/hangouts/hangout_1758250598719_ti4p2nlxr`)
  
  if (hangoutResponse.success) {
    console.log('✅ Hangout page loads successfully')
    const hasLoading = hangoutResponse.data.includes('Loading hangout...')
    const hasSimplified = hangoutResponse.data.includes('SimplifiedHangoutPage')
    console.log('📊 Has loading state:', hasLoading)
    console.log('📊 Has simplified component:', hasSimplified)
  } else {
    console.log('❌ Hangout page failed to load:', hangoutResponse.error)
  }

  // Test 2: Check hangout API
  console.log('\n2️⃣ Testing hangout API...')
  const hangoutApiResponse = await makeRequest(`${BASE_URL}/api/hangouts/hangout_1758250598719_ti4p2nlxr`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (hangoutApiResponse.success) {
    console.log('✅ Hangout API works')
    console.log('📊 Hangout data:', JSON.stringify(hangoutApiResponse.data, null, 2))
  } else {
    console.log('❌ Hangout API failed:', hangoutApiResponse.data)
  }

  // Test 3: Check polls API
  console.log('\n3️⃣ Testing polls API...')
  const pollsApiResponse = await makeRequest(`${BASE_URL}/api/hangouts/hangout_1758250598719_ti4p2nlxr/polls-simple`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (pollsApiResponse.success) {
    console.log('✅ Polls API works')
    console.log('📊 Polls data:', JSON.stringify(pollsApiResponse.data, null, 2))
  } else {
    console.log('❌ Polls API failed:', pollsApiResponse.data)
  }

  // Test 4: Check if we can create a poll
  console.log('\n4️⃣ Testing poll creation...')
  const createPollResponse = await makeRequest(`${BASE_URL}/api/hangouts/hangout_1758250598719_ti4p2nlxr/polls`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Test Simplified Poll',
      description: 'Testing the simplified poll creation',
      options: [
        { text: 'Option A' },
        { text: 'Option B' },
        { text: 'Option C' }
      ],
      allowMultiple: false,
      isAnonymous: false,
      consensusConfig: {
        consensusType: 'PERCENTAGE',
        threshold: 60,
        minParticipants: 2,
        allowTies: false
      },
      allowDelegation: false,
      allowAbstention: true,
      isPublic: false
    })
  })

  if (createPollResponse.success) {
    console.log('✅ Poll creation works')
    console.log('📊 Created poll:', JSON.stringify(createPollResponse.data, null, 2))
  } else {
    console.log('❌ Poll creation failed:', createPollResponse.data)
  }

  console.log('\n🎉 Simplified frontend test completed!')
  console.log('\n📝 Next steps:')
  console.log('   1. Open browser and sign in as Bill')
  console.log('   2. Navigate to the hangout')
  console.log('   3. Check browser console for any errors')
  console.log('   4. Verify the simplified UI is working')
}

// Run the test
testSimplifiedFrontend().catch(console.error)






