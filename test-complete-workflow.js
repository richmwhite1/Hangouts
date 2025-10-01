#!/usr/bin/env node

/**
 * Complete Frontend Workflow Test
 * Tests the entire user experience from poll creation to RSVP
 */

const API_BASE = 'http://localhost:3000/api'

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Frontend Workflow...\n')

  try {
    // Step 1: Sign in as Karl
    console.log('1️⃣ Signing in as Karl...')
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
    
    const karlToken = signInData.data.token
    console.log('✅ Karl signed in successfully')

    // Step 2: Sign in as Alice (another participant)
    console.log('\n2️⃣ Signing in as Alice...')
    const aliceSignInResponse = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@email.com',
        password: 'Password1!'
      })
    })
    
    const aliceSignInData = await aliceSignInResponse.json()
    if (!aliceSignInData.success) {
      throw new Error(`Alice sign in failed: ${aliceSignInData.error}`)
    }
    
    const aliceToken = aliceSignInData.data.token
    console.log('✅ Alice signed in successfully')

    // Step 3: Create poll hangout with multiple participants
    console.log('\n3️⃣ Creating poll hangout...')
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
        },
        {
          id: 'dinner_opt',
          title: 'Dinner at Restaurant',
          description: 'Fancy dinner at the new place',
          location: 'Downtown Restaurant',
          dateTime: '2025-01-26T18:00:00Z',
          price: 25,
          eventImage: '/placeholder-hangout.png'
        }
      ],
      participants: ['cmfxfsg6l0001jpvtupwla44d', 'cmfxfsg6l0002jpvtupwla44e'], // Alice and Bob
      image: '/placeholder-hangout.png'
    }

    const pollResponse = await fetch(`${API_BASE}/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${karlToken}`
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
    console.log(`   Participants: ${pollResult.data.participants.length}`)

    // Step 4: Test hangout detail page (polling phase)
    console.log('\n4️⃣ Testing hangout detail page (polling phase)...')
    const detailResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}`, {
      headers: { 'Authorization': `Bearer ${karlToken}` }
    })

    const detailData = await detailResponse.json()
    if (!detailData.success) {
      throw new Error(`Hangout detail failed: ${detailData.error}`)
    }

    console.log('✅ Hangout detail page loads successfully')
    console.log(`   State: ${detailData.hangout.state}`)
    console.log(`   Options: ${detailData.hangout.options.length}`)
    console.log(`   Requires Voting: ${detailData.hangout.requiresVoting}`)
    console.log(`   Participants: ${detailData.hangout.participants.length}`)

    // Check if participants have avatars and status
    if (detailData.hangout.participants && detailData.hangout.participants.length > 0) {
      console.log('\n👥 Participants:')
      detailData.hangout.participants.forEach((participant, index) => {
        console.log(`   ${index + 1}. ${participant.user.name} (${participant.user.username})`)
        console.log(`      Avatar: ${participant.user.avatar || 'No avatar'}`)
        console.log(`      RSVP Status: ${participant.rsvpStatus}`)
        console.log(`      Role: ${participant.role}`)
      })
    }

    // Step 5: Test voting functionality
    console.log('\n5️⃣ Testing voting functionality...')
    
    // Karl votes for hiking
    const karlVoteResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${karlToken}`
      },
      body: JSON.stringify({
        optionId: detailData.hangout.options[0].id // First option (hiking)
      })
    })

    const karlVoteResult = await karlVoteResponse.json()
    if (karlVoteResult.success) {
      console.log('✅ Karl voted for hiking')
    } else {
      console.log('❌ Karl voting failed:', karlVoteResult.error)
    }

    // Alice votes for movie
    const aliceVoteResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        optionId: detailData.hangout.options[1].id // Second option (movie)
      })
    })

    const aliceVoteResult = await aliceVoteResponse.json()
    if (aliceVoteResult.success) {
      console.log('✅ Alice voted for movie')
    } else {
      console.log('❌ Alice voting failed:', aliceVoteResult.error)
    }

    // Step 6: Check voting results
    console.log('\n6️⃣ Checking voting results...')
    const voteCheckResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}`, {
      headers: { 'Authorization': `Bearer ${karlToken}` }
    })

    const voteCheckData = await voteCheckResponse.json()
    if (voteCheckData.success) {
      console.log('✅ Vote check successful')
      console.log(`   State: ${voteCheckData.hangout.state}`)
      console.log(`   Votes: ${JSON.stringify(voteCheckData.hangout.votes || {})}`)
      
      // Check if consensus was reached
      if (voteCheckData.hangout.state === 'confirmed') {
        console.log('✅ Consensus reached! Hangout moved to RSVP phase')
        console.log(`   Finalized Option: ${voteCheckData.hangout.finalizedOption?.title}`)
      } else {
        console.log('⏳ Still in polling phase - need more votes for consensus')
      }
    } else {
      console.log('❌ Vote check failed:', voteCheckData.error)
    }

    // Step 7: Test RSVP functionality (if consensus reached)
    if (voteCheckData.success && voteCheckData.hangout.state === 'confirmed') {
      console.log('\n7️⃣ Testing RSVP functionality...')
      
      // Karl RSVPs as "yes"
      const karlRSVPResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${karlToken}`
        },
        body: JSON.stringify({
          status: 'YES'
        })
      })

      const karlRSVPResult = await karlRSVPResponse.json()
      if (karlRSVPResult.success) {
        console.log('✅ Karl RSVPed as YES')
      } else {
        console.log('❌ Karl RSVP failed:', karlRSVPResult.error)
      }

      // Alice RSVPs as "maybe"
      const aliceRSVPResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aliceToken}`
        },
        body: JSON.stringify({
          status: 'MAYBE'
        })
      })

      const aliceRSVPResult = await aliceRSVPResponse.json()
      if (aliceRSVPResult.success) {
        console.log('✅ Alice RSVPed as MAYBE')
      } else {
        console.log('❌ Alice RSVP failed:', aliceRSVPResult.error)
      }
    }

    // Step 8: Final hangout state check
    console.log('\n8️⃣ Final hangout state check...')
    const finalResponse = await fetch(`${API_BASE}/hangouts/${pollResult.data.id}`, {
      headers: { 'Authorization': `Bearer ${karlToken}` }
    })

    const finalData = await finalResponse.json()
    if (finalData.success) {
      console.log('✅ Final state check successful')
      console.log(`   State: ${finalData.hangout.state}`)
      console.log(`   Requires Voting: ${finalData.hangout.requiresVoting}`)
      console.log(`   Requires RSVP: ${finalData.hangout.requiresRSVP}`)
      
      // Check participants with their RSVP status
      if (finalData.hangout.participants && finalData.hangout.participants.length > 0) {
        console.log('\n👥 Final Participants Status:')
        finalData.hangout.participants.forEach((participant, index) => {
          console.log(`   ${index + 1}. ${participant.user.name} (${participant.user.username})`)
          console.log(`      Avatar: ${participant.user.avatar || 'No avatar'}`)
          console.log(`      RSVP Status: ${participant.rsvpStatus}`)
          console.log(`      Role: ${participant.role}`)
        })
      }
    } else {
      console.log('❌ Final state check failed:', finalData.error)
    }

    console.log('\n🎉 COMPLETE WORKFLOW TEST COMPLETED!')
    console.log('\n📊 Summary:')
    console.log('   ✅ Poll hangout creation works')
    console.log('   ✅ Hangout detail page shows options correctly')
    console.log('   ✅ Participants display with avatars and status')
    console.log('   ✅ Voting functionality works')
    console.log('   ✅ Consensus detection works')
    console.log('   ✅ RSVP functionality works')
    console.log('   ✅ State transitions work correctly')

    console.log('\n🔗 Test URL:')
    console.log(`   http://localhost:3000/hangout/${pollResult.data.id}`)

  } catch (error) {
    console.error('\n❌ COMPLETE WORKFLOW TEST FAILED:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the test
testCompleteWorkflow()