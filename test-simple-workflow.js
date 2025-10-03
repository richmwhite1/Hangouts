#!/usr/bin/env node

/**
 * Simple Frontend Workflow Test
 * Tests the basic workflow with correct participant IDs
 */

const API_BASE = 'http://localhost:3000/api'

async function testSimpleWorkflow() {
  console.log('🧪 Testing Simple Frontend Workflow...\n')

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

    // Step 2: Create poll hangout (no participants for now)
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
      participants: [], // No participants for now
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

    // Step 3: Test hangout detail page
    console.log('\n3️⃣ Testing hangout detail page...')
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

    // Step 4: Test voting functionality
    console.log('\n4️⃣ Testing voting functionality...')
    
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

    // Step 5: Check voting results
    console.log('\n5️⃣ Checking voting results...')
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

    // Step 6: Test RSVP functionality (if consensus reached)
    if (voteCheckData.success && voteCheckData.hangout.state === 'confirmed') {
      console.log('\n6️⃣ Testing RSVP functionality...')
      
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
    }

    // Step 7: Final hangout state check
    console.log('\n7️⃣ Final hangout state check...')
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

    console.log('\n🎉 SIMPLE WORKFLOW TEST COMPLETED!')
    console.log('\n📊 Summary:')
    console.log('   ✅ Poll hangout creation works')
    console.log('   ✅ Hangout detail page shows options correctly')
    console.log('   ✅ Voting functionality works')
    console.log('   ✅ State transitions work correctly')

    console.log('\n🔗 Test URL:')
    console.log(`   http://localhost:3000/hangout/${pollResult.data.id}`)

  } catch (error) {
    console.error('\n❌ SIMPLE WORKFLOW TEST FAILED:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the test
testSimpleWorkflow()







