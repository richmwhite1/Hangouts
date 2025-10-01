#!/usr/bin/env node

/**
 * Test Hangout Detail Page
 * Verifies the hangout detail page shows options and voting correctly
 */

const API_BASE = 'http://localhost:3000/api'

async function testHangoutDetail() {
  console.log('🧪 Testing Hangout Detail Page...\n')

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

    // Step 2: Create poll hangout
    console.log('\n2️⃣ Creating poll hangout...')
    const pollData = {
      title: 'Weekend Adventure Poll',
      description: 'Vote on what we should do this weekend!',
      type: 'multi_option',
      options: [
        {
          id: 'hiking_opt',
          title: 'Mountain Hiking',
          description: 'Beautiful trails and fresh air',
          location: 'Mountain Trail Park',
          dateTime: '2025-01-26T09:00:00Z',
          price: 0,
          eventImage: '/mountain-hiking-trail.png'
        },
        {
          id: 'movie_opt',
          title: 'Movie Night',
          description: 'Latest blockbuster at the cinema',
          location: 'Downtown Cinema',
          dateTime: '2025-01-26T19:00:00Z',
          price: 12,
          eventImage: '/modern-coffee-shop.png'
        }
      ],
      participants: ['cmfxfsg6l0001jpvtupwla44d'],
      image: '/placeholder-hangout.png'
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
    console.log(`   Image: ${pollResult.data.image}`)

    // Step 3: Test hangout detail page
    console.log('\n3️⃣ Testing hangout detail page...')
    const detailResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const detailData = await detailResponse.json()
    if (!detailData.success) {
      throw new Error(`Hangout detail failed: ${detailData.error}`)
    }

    console.log('✅ Hangout detail page loads successfully')
    console.log(`   Title: ${detailData.hangout.title}`)
    console.log(`   Image: ${detailData.hangout.image}`)
    console.log(`   State: ${detailData.hangout.state}`)
    console.log(`   Options: ${detailData.hangout.options?.length || 0}`)
    console.log(`   Participants: ${detailData.hangout.participants.length}`)

    if (detailData.hangout.options && detailData.hangout.options.length > 0) {
      console.log('\n📋 Poll Options:')
      detailData.hangout.options.forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.title}`)
        console.log(`      Location: ${option.location}`)
        console.log(`      Date: ${option.dateTime}`)
        console.log(`      Price: $${option.price}`)
        console.log(`      Image: ${option.eventImage}`)
      })
    } else {
      console.log('❌ No options found in hangout data')
    }

    console.log('\n🎉 HANGOUT DETAIL TEST COMPLETED!')
    console.log('\n🔗 Test URL:')
    console.log(`   http://localhost:3000/hangout/${pollResult.data.id}`)

  } catch (error) {
    console.error('\n❌ HANGOUT DETAIL TEST FAILED:', error.message)
    process.exit(1)
  }
}

// Run the test
testHangoutDetail()




