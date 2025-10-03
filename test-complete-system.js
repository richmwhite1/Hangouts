const jwt = require('jsonwebtoken')

const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random'

async function testCompleteSystem() {
  console.log('🧪 Testing Complete System...\n')
  
  // Create valid token
  const token = jwt.sign(
    {
      userId: 'cmfq75h2v0000jpf08u3kfi6b',
      email: 'bill@email.com',
      username: 'bill'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  console.log('✅ JWT Token created')
  
  // Test 1: Hangouts API
  console.log('\n🏠 Testing Hangouts API...')
  try {
    const hangoutsResponse = await fetch('http://localhost:3000/api/hangouts', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (hangoutsResponse.ok) {
      const hangoutsData = await hangoutsResponse.json()
      const hangoutCount = hangoutsData.data.hangouts.length
      console.log(`✅ Hangouts API: ${hangoutCount} hangouts found`)
      
      // Show first few hangouts
      hangoutsData.data.hangouts.slice(0, 3).forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.title} (${h.image ? 'Has image' : 'No image'})`)
      })
    } else {
      console.log('❌ Hangouts API failed:', await hangoutsResponse.text())
    }
  } catch (error) {
    console.log('❌ Hangouts API error:', error.message)
  }
  
  // Test 2: Polls API
  console.log('\n📊 Testing Polls API...')
  try {
    const pollsResponse = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0/polls-simple', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (pollsResponse.ok) {
      const pollsData = await pollsResponse.json()
      const pollCount = pollsData.polls.length
      console.log(`✅ Polls API: ${pollCount} polls found`)
      
      if (pollCount > 0) {
        const poll = pollsData.polls[0]
        console.log(`   Poll: "${poll.title}"`)
        console.log(`   Options: ${poll.options.length}`)
        console.log(`   Total Votes: ${poll.totalVotes}`)
        console.log(`   Participants: ${poll.participants.length}`)
      }
    } else {
      console.log('❌ Polls API failed:', await pollsResponse.text())
    }
  } catch (error) {
    console.log('❌ Polls API error:', error.message)
  }
  
  // Test 3: Vote on poll
  console.log('\n🗳️ Testing Vote API...')
  try {
    const voteResponse = await fetch('http://localhost:3000/api/polls/poll_1758586812086_e73d4y0g7/vote-simple', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        optionId: 'cmfvt6kl40019jpnbamxhv2lp' // Dinner option
      })
    })
    
    if (voteResponse.ok) {
      const voteData = await voteResponse.json()
      console.log('✅ Vote API: Vote cast successfully')
      console.log(`   Voted for: ${voteData.vote.option}`)
    } else {
      console.log('❌ Vote API failed:', await voteResponse.text())
    }
  } catch (error) {
    console.log('❌ Vote API error:', error.message)
  }
  
  // Test 4: Verify vote count
  console.log('\n🔍 Verifying vote count...')
  try {
    const pollsResponse = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0/polls-simple', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (pollsResponse.ok) {
      const pollsData = await pollsResponse.json()
      const poll = pollsData.polls[0]
      
      console.log(`✅ Vote verification:`)
      console.log(`   Total votes: ${poll.totalVotes}`)
      poll.options.forEach((option, i) => {
        console.log(`   Option ${i + 1}: "${option.text}" - ${option.votes.length} votes`)
      })
    }
  } catch (error) {
    console.log('❌ Vote verification error:', error.message)
  }
  
  console.log('\n🎉 System Test Complete!')
  console.log('\n📋 Next Steps:')
  console.log('1. Open auto-fix-auth.html in browser')
  console.log('2. Click "Fix Authentication"')
  console.log('3. Click "Go to App"')
  console.log('4. Navigate to hangout "assdfasd"')
  console.log('5. Check "The Plan" tab for the poll')
  console.log('6. Verify you can vote on the poll')
}

testCompleteSystem().catch(console.error)








