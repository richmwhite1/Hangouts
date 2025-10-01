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

async function testPollWithExistingUser() {
  console.log('🧪 Testing Poll with Existing User...\n')

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
    console.log('❌ No hangouts found. Please create a hangout first.')
    return
  }

  const hangoutId = hangouts[0].id
  console.log('✅ Using hangout:', hangoutId)

  // Step 2: Create a poll
  console.log('\n2️⃣ Creating poll...')
  const pollResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/polls`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'What should we do?',
      description: 'Choose your preferred activity',
      options: [
        { text: 'Go to the movies', description: 'Watch a new release' },
        { text: 'Have dinner', description: 'Try a new restaurant' },
        { text: 'Go bowling', description: 'Fun group activity' }
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

  if (!pollResponse.success) {
    console.error('❌ Failed to create poll:', pollResponse.data)
    console.error('❌ Full response:', JSON.stringify(pollResponse, null, 2))
    return
  }

  const pollId = pollResponse.data.poll.id
  console.log('✅ Poll created:', pollId)
  console.log('📊 Poll creation response:', JSON.stringify(pollResponse.data, null, 2))

  // Get the poll details to get the option IDs
  console.log('\n3️⃣ Getting poll details...')
  const pollDetailsResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/polls-simple`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!pollDetailsResponse.success) {
    console.error('❌ Failed to get poll details:', pollDetailsResponse.data)
    return
  }

  const polls = pollDetailsResponse.data.polls
  const ourPoll = polls.find(p => p.id === pollId)
  
  if (!ourPoll) {
    console.error('❌ Could not find our poll in the list')
    return
  }

  console.log('📊 Our poll options:')
  ourPoll.options.forEach((option, index) => {
    console.log(`   ${index + 1}. ${option.what} (ID: ${option.id})`)
  })

  // Step 4: Test voting
  console.log('\n4️⃣ Testing voting...')
  const voteResponse = await makeRequest(`${BASE_URL}/api/polls/${pollId}/vote-simple`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      optionId: ourPoll.options[0].id, // Vote for first option
      voteType: 'SINGLE',
      weight: 1.0
    })
  })

  if (voteResponse.success) {
    console.log('✅ Vote cast successfully')
  } else {
    console.log('❌ Vote failed:', voteResponse.data)
  }

  // Step 5: Check poll status
  console.log('\n5️⃣ Checking poll status...')
  const pollStatusResponse = await makeRequest(`${BASE_URL}/api/hangouts/${hangoutId}/polls-simple`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (pollStatusResponse.success) {
    const polls = pollStatusResponse.data.polls
    console.log('📊 Poll status:')
    polls.forEach(poll => {
      console.log(`   Title: ${poll.title}`)
      console.log(`   Active: ${poll.isActive}`)
      console.log(`   Consensus Reached: ${poll.consensusReached}`)
      console.log(`   Total Votes: ${poll.totalVotes}`)
      console.log(`   Options:`)
      poll.options.forEach(option => {
        console.log(`     - ${option.what}: ${option.voteCount} votes (${option.percentage}%)`)
      })
    })
  }

  // Step 6: Test frontend display
  console.log('\n6️⃣ Testing frontend display...')
  const frontendResponse = await makeRequest(`${BASE_URL}/hangouts/${hangoutId}`)
  
  if (frontendResponse.success) {
    const html = frontendResponse.data
    const hasPollContent = html.includes('Poll in Progress') || html.includes('Consensus Reached')
    const hasVotingOptions = html.includes('vote') || html.includes('option')
    const hasRSVP = html.includes('RSVP') || html.includes('Going')
    const hasPrimaryPhoto = html.includes('h-80') || html.includes('object-cover')
    
    console.log('🎨 Frontend Analysis:')
    console.log(`   Primary Photo: ${hasPrimaryPhoto ? '✅' : '❌'}`)
    console.log(`   Poll Content: ${hasPollContent ? '✅' : '❌'}`)
    console.log(`   Voting Options: ${hasVotingOptions ? '✅' : '❌'}`)
    console.log(`   RSVP Section: ${hasRSVP ? '✅' : '❌'}`)
    
    if (!hasPollContent) {
      console.log('   ⚠️  Note: Frontend shows "Please sign in" - this is expected for API testing')
    }
  } else {
    console.log('❌ Frontend test failed')
  }

  console.log('\n🎉 Poll test with existing user finished!')
  console.log('\n📝 Next steps:')
  console.log('   1. Open browser and sign in as Bill')
  console.log('   2. Navigate to the hangout')
  console.log('   3. Check "The Plan" tab for poll display')
  console.log('   4. Test voting by clicking on poll options')
  console.log('   5. Test photo upload in "Photos" tab')
  console.log('   6. Test chat in "Chat" tab')
}

// Run the test
testPollWithExistingUser().catch(console.error)
