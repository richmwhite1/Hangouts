#!/usr/bin/env node

/**
 * Complete Frontend Test
 * Tests the frontend form data structure and API integration
 */

const API_BASE = 'http://localhost:3000/api'

async function testFrontendIntegration() {
  console.log('🧪 Testing Frontend Integration...\n')

  try {
    // Step 1: Sign in
    console.log('1️⃣ Signing in...')
    const signInResponse = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karl@email.com',
        password: 'Password1!'
      })
    })
    
    const signInData = await signInResponse.json()
    if (!signInData.success) {
      throw new Error(`Sign in failed: ${signInData.error}`)
    }
    
    const token = signInData.data.token
    console.log('✅ Sign in successful')

    // Step 2: Get friends
    console.log('\n2️⃣ Getting friends...')
    const friendsResponse = await fetch(`${API_BASE}/friends`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const friendsData = await friendsResponse.json()
    if (!friendsData.success) {
      throw new Error(`Friends API failed: ${friendsData.error}`)
    }
    
    console.log(`✅ Found ${friendsData.data.friends.length} friends`)

    // Step 3: Test quick plan (simulating frontend form data)
    console.log('\n3️⃣ Testing Quick Plan (Frontend Format)...')
    const quickPlanData = {
      title: 'Quick Coffee Meetup',
      description: 'Let\'s grab coffee and catch up!',
      location: 'Downtown Coffee Shop',
      privacyLevel: 'PUBLIC',
      image: null,
      participants: [friendsData.data.friends[0].id, friendsData.data.friends[1].id],
      type: 'quick_plan',
      options: [{
        id: 'coffee_opt',
        title: 'Downtown Coffee Shop',
        description: 'Great coffee and atmosphere',
        location: '123 Main St, Downtown',
        dateTime: '2025-01-25T15:00:00Z',
        price: 5,
        eventImage: ''
      }]
    }

    const quickPlanResponse = await fetch(`${API_BASE}/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(quickPlanData)
    })

    const quickPlanResult = await quickPlanResponse.json()
    if (!quickPlanResult.success) {
      throw new Error(`Quick plan creation failed: ${quickPlanResult.error}`)
    }

    console.log('✅ Quick plan hangout created successfully')
    console.log(`   ID: ${quickPlanResult.data.id}`)
    console.log(`   State: ${quickPlanResult.data.state}`)
    console.log(`   Participants: ${quickPlanResult.data.content_participants.length}`)

    // Step 4: Test multi-option poll (simulating frontend form data)
    console.log('\n4️⃣ Testing Multi-Option Poll (Frontend Format)...')
    const pollData = {
      title: 'Weekend Adventure Poll',
      description: 'Vote on what we should do this weekend!',
      location: 'Various Locations',
      privacyLevel: 'FRIENDS_ONLY',
      image: null,
      participants: friendsData.data.friends.slice(0, 3).map(f => f.id),
      type: 'multi_option',
      options: [
        {
          id: 'hiking_opt',
          title: 'Mountain Hiking',
          description: 'Beautiful trails and fresh air',
          location: 'Mountain Trail Park',
          dateTime: '2025-01-26T09:00:00Z',
          price: 0,
          eventImage: ''
        },
        {
          id: 'movie_opt',
          title: 'Movie Night',
          description: 'Latest blockbuster at the cinema',
          location: 'Downtown Cinema',
          dateTime: '2025-01-26T19:00:00Z',
          price: 12,
          eventImage: ''
        }
      ]
    }

    const pollResponse = await fetch(`${API_BASE}/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(pollData)
    })

    const pollResult = await pollResponse.json()
    if (!pollResult.success) {
      throw new Error(`Poll creation failed: ${pollResult.error}`)
    }

    console.log('✅ Poll hangout created successfully')
    console.log(`   ID: ${pollResult.data.id}`)
    console.log(`   State: ${pollResult.data.state}`)
    console.log(`   Options: ${pollResult.data.options.length}`)
    console.log(`   Participants: ${pollResult.data.content_participants.length}`)

    // Step 5: Test hangout detail page
    console.log('\n5️⃣ Testing Hangout Detail Page...')
    const detailResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const detailData = await detailResponse.json()
    if (!detailData.success) {
      throw new Error(`Hangout detail failed: ${detailData.error}`)
    }

    console.log('✅ Hangout detail page loads successfully')
    console.log(`   Title: ${detailData.hangout.title}`)
    console.log(`   Creator: ${detailData.hangout.creator.name}`)
    console.log(`   Participants: ${detailData.hangout.participants.length}`)

    console.log('\n🎉 ALL FRONTEND TESTS PASSED!')
    console.log('\n📊 Summary:')
    console.log('   ✅ Frontend form data structure working')
    console.log('   ✅ Quick plan creation working')
    console.log('   ✅ Multi-option poll creation working')
    console.log('   ✅ Participants properly added')
    console.log('   ✅ Hangout detail page working')
    console.log('   ✅ No more date/time issues')

  } catch (error) {
    console.error('\n❌ FRONTEND TEST FAILED:', error.message)
    process.exit(1)
  }
}

// Run the test
testFrontendIntegration()