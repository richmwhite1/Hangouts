const jwt = require('jsonwebtoken')

const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random'

async function testConsensus() {
  console.log('🧪 Testing Consensus System...\n')
  
  // Create token for Bill
  const billToken = jwt.sign(
    {
      userId: 'cmfq75h2v0000jpf08u3kfi6b',
      email: 'bill@email.com',
      username: 'bill'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  // Create token for a different user (simulate another participant)
  const otherUserToken = jwt.sign(
    {
      userId: 'cmfq8mih30007jpjmw2xgv68g', // This is one of the invited participants
      email: 'other@email.com',
      username: 'other'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  console.log('✅ Tokens created')
  
  // Test 1: Check current poll status
  console.log('\n📊 Current poll status...')
  try {
    const response = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0/polls-simple', {
      headers: { 'Authorization': `Bearer ${billToken}` }
    })
    
    if (response.ok) {
      const data = await response.json()
      const poll = data.polls[0]
      console.log(`   Total votes: ${poll.totalVotes}`)
      console.log(`   Consensus reached: ${poll.consensusReached}`)
      console.log(`   Min participants needed: ${poll.consensusConfig.minParticipants}`)
      console.log(`   Threshold: ${poll.consensusConfig.threshold}%`)
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
  
  // Test 2: Have the other user vote
  console.log('\n🗳️ Other user voting...')
  try {
    const response = await fetch('http://localhost:3000/api/polls/poll_1758586812086_e73d4y0g7/vote-simple', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${otherUserToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        optionId: 'cmfvt6kl40019jpnbamxhv2lp' // Dinner option
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Vote cast: ${data.vote.option}`)
    } else {
      const error = await response.text()
      console.log(`❌ Vote failed: ${error}`)
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
  
  // Test 3: Check consensus status
  console.log('\n🔍 Checking consensus status...')
  try {
    const response = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0/polls-simple', {
      headers: { 'Authorization': `Bearer ${billToken}` }
    })
    
    if (response.ok) {
      const data = await response.json()
      const poll = data.polls[0]
      console.log(`   Total votes: ${poll.totalVotes}`)
      console.log(`   Consensus reached: ${poll.consensusReached}`)
      console.log(`   Consensus level: ${poll.consensusLevel}%`)
      
      poll.options.forEach((option, i) => {
        console.log(`   Option ${i + 1}: "${option.text}" - ${option.votes.length} votes`)
      })
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
  
  console.log('\n🎉 Consensus test complete!')
}

testConsensus().catch(console.error)








