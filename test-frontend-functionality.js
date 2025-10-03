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

async function testFrontendFunctionality() {
  console.log('🧪 Testing Frontend Functionality...\n')

  const token = generateToken(existingUser)
  console.log('👤 Using existing user:', existingUser.name)

  // Step 1: Get existing hangouts
  console.log('\n1️⃣ Getting existing hangouts...')
  const hangoutsResponse = await makeRequest(`${BASE_URL}/api/hangouts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!hangoutsResponse.success) {
    console.error('❌ Failed to get hangouts:', hangoutsResponse.data)
    return
  }

  const hangouts = hangoutsResponse.data?.data?.hangouts || []
  console.log('📊 Found hangouts:', hangouts.length)
  
  if (hangouts.length === 0) {
    console.log('❌ No hangouts found.')
    return
  }

  const hangoutId = hangouts[0].id
  console.log('✅ Using hangout:', hangoutId)

  // Step 2: Check current polls
  console.log('\n2️⃣ Checking current polls...')
  const pollsResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/polls-simple`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (pollsResponse.success) {
    const polls = pollsResponse.data.polls
    console.log('📊 Current polls:', polls.length)
    polls.forEach((poll, index) => {
      console.log(`   ${index + 1}. ${poll.title} - Active: ${poll.isActive} - Consensus: ${poll.consensusReached}`)
    })
  }

  // Step 3: Create a new poll if none exist
  console.log('\n3️⃣ Creating a test poll...')
  const pollResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/polls`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Frontend Test Poll',
      description: 'Testing poll display in frontend',
      options: [
        { text: 'Option A', description: 'First option' },
        { text: 'Option B', description: 'Second option' },
        { text: 'Option C', description: 'Third option' }
      ],
      allowMultiple: false,
      isAnonymous: false,
      consensusConfig: {
        consensusType: 'PERCENTAGE',
        threshold: 60,
        minParticipants: 1,
        allowTies: false
      },
      allowDelegation: false,
      allowAbstention: true,
      isPublic: false
    })
  })

  if (pollResponse.success) {
    console.log('✅ Poll created successfully')
    const pollId = pollResponse.data.poll.id
    console.log('📊 Poll ID:', pollId)
  } else {
    console.log('❌ Poll creation failed:', pollResponse.data)
  }

  // Step 4: Check polls again
  console.log('\n4️⃣ Checking polls after creation...')
  const pollsAfterResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/polls-simple`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (pollsAfterResponse.success) {
    const polls = pollsAfterResponse.data.polls
    console.log('📊 Polls after creation:', polls.length)
    const activePolls = polls.filter(p => p.isActive && !p.consensusReached)
    console.log('📊 Active polls:', activePolls.length)
    
    if (activePolls.length > 0) {
      console.log('✅ Active poll found - frontend should display it')
      activePolls.forEach(poll => {
        console.log(`   - ${poll.title} with ${poll.options.length} options`)
      })
    } else {
      console.log('❌ No active polls found - this is the problem!')
    }
  }

  // Step 5: Test photo upload API
  console.log('\n5️⃣ Testing photo upload API...')
  const testPhotoResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/photos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (testPhotoResponse.success) {
    console.log('✅ Photo upload API is working')
  } else {
    console.log('❌ Photo upload API failed:', testPhotoResponse.data)
  }

  // Step 6: Test chat API
  console.log('\n6️⃣ Testing chat API...')
  const chatResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/comments`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (chatResponse.success) {
    console.log('✅ Chat API is working')
  } else {
    console.log('❌ Chat API failed:', chatResponse.data)
  }

  console.log('\n🎉 Frontend functionality test completed!')
  console.log('\n📝 Next steps:')
  console.log('   1. Open browser and sign in as Bill')
  console.log('   2. Navigate to the hangout')
  console.log('   3. Check browser console for debug logs')
  console.log('   4. Verify poll display in "The Plan" tab')
  console.log('   5. Test photo upload in "Photos" tab')
  console.log('   6. Test chat in "Chat" tab')
}

// Run the test
testFrontendFunctionality().catch(console.error)









