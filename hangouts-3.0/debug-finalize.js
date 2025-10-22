const jwt = require('jsonwebtoken')

const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random'

async function debugFinalize() {
  console.log('🔍 Debugging finalize-plan API...\n')
  
  const token = jwt.sign(
    {
      userId: 'cmfq75h2v0000jpf08u3kfi6b',
      email: 'bill@email.com',
      username: 'bill'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  console.log('✅ Token created')
  
  // Test 1: Check if hangout exists
  console.log('\n🏠 Checking hangout...')
  try {
    const response = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Hangout found:', data.hangout.title)
      console.log('   Hangout details ID:', data.hangout.hangout_details?.id)
    } else {
      console.log('❌ Hangout not found:', await response.text())
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
  
  // Test 2: Check polls
  console.log('\n📊 Checking polls...')
  try {
    const response = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0/polls-simple', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const data = await response.json()
      const poll = data.polls[0]
      console.log('✅ Poll found:', poll.title)
      console.log('   Consensus reached:', poll.consensusReached)
      console.log('   Total votes:', poll.totalVotes)
      console.log('   Min participants:', poll.consensusConfig.minParticipants)
    } else {
      console.log('❌ Polls not found:', await response.text())
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
  
  // Test 3: Try finalize-plan
  console.log('\n🎯 Trying finalize-plan...')
  try {
    const response = await fetch('http://localhost:3000/api/hangouts/hangout_1758585614387_1tkfo6rg0/finalize-plan', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Finalize successful:', data)
    } else {
      const error = await response.text()
      console.log('❌ Finalize failed:', error)
    }
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

debugFinalize().catch(console.error)


























