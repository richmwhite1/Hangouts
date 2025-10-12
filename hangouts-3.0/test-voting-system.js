const puppeteer = require('puppeteer-core')
const { execSync } = require('child_process')

const BASE_URL = 'https://hangouts-production-adc4.up.railway.app'

// Test users
const testUsers = [
  { username: 'richardwhite', password: 'password123' },
  { username: 'testuser1', password: 'password123' },
  { username: 'testuser2', password: 'password123' },
  { username: 'testuser3', password: 'password123' }
]

async function createTestHangout() {
  console.log('🏗️ Creating test hangout with multiple options...')
  
  const response = await fetch(`${BASE_URL}/api/hangouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TEST_TOKEN || ''}`
    },
    body: JSON.stringify({
      title: 'Voting Test Hangout - Multi Option',
      description: 'Testing voting system with multiple users',
      type: 'HANGOUT',
      privacyLevel: 'PUBLIC',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      location: 'Test Location',
      options: [
        {
          id: 'option_1',
          title: 'Option 1: Movie Night',
          description: 'Watch a movie together',
          location: 'Cinema Downtown',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 15
        },
        {
          id: 'option_2', 
          title: 'Option 2: Restaurant Dinner',
          description: 'Have dinner at a nice restaurant',
          location: 'Restaurant Central',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 25
        },
        {
          id: 'option_3',
          title: 'Option 3: Outdoor Activity',
          description: 'Go hiking or outdoor activity',
          location: 'Nature Park',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 10
        }
      ],
      requiresVoting: true,
      requiresRSVP: true,
      maxParticipants: 10
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create hangout: ${response.status} - ${error}`)
  }

  const data = await response.json()
  console.log('✅ Test hangout created:', data.data.id)
  return data.data
}

async function signInUser(browser, user) {
  console.log(`🔐 Signing in user: ${user.username}`)
  
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/signin`)
  
  // Wait for form to load
  await page.waitForSelector('input[name="username"]', { timeout: 10000 })
  
  // Fill in credentials
  await page.type('input[name="username"]', user.username)
  await page.type('input[name="password"]', user.password)
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for navigation
  await page.waitForNavigation({ timeout: 10000 })
  
  // Get auth token
  const token = await page.evaluate(() => localStorage.getItem('token'))
  
  if (!token) {
    throw new Error(`Failed to sign in user: ${user.username}`)
  }
  
  console.log(`✅ User ${user.username} signed in successfully`)
  return { page, token }
}

async function castVote(page, hangoutId, optionId, token) {
  console.log(`🗳️ Casting vote for option: ${optionId}`)
  
  const response = await page.evaluate(async ({ hangoutId, optionId, token }) => {
    const res = await fetch(`/api/hangouts/${hangoutId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ optionId })
    })
    
    return {
      status: res.status,
      data: await res.json()
    }
  }, { hangoutId, optionId, token })
  
  if (response.status !== 200) {
    throw new Error(`Vote failed: ${response.status} - ${JSON.stringify(response.data)}`)
  }
  
  console.log(`✅ Vote cast successfully for option: ${optionId}`)
  return response.data
}

async function getHangoutDetails(hangoutId, token) {
  const response = await fetch(`${BASE_URL}/api/hangouts/${hangoutId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get hangout details: ${response.status}`)
  }
  
  return response.json()
}

async function testVotingSystem() {
  console.log('🚀 Starting comprehensive voting system test...')
  
  let browser
  try {
    // Create test hangout
    const hangout = await createTestHangout()
    const hangoutId = hangout.id
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    // Sign in users and cast votes
    const userSessions = []
    
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i]
      const { page, token } = await signInUser(browser, user)
      userSessions.push({ page, token, user })
      
      // Cast vote (distribute votes across options)
      const optionId = `option_${(i % 3) + 1}`
      await castVote(page, hangoutId, optionId, token)
      
      // Wait a bit between votes
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Check hangout state after all votes
    console.log('📊 Checking hangout state after all votes...')
    const hangoutDetails = await getHangoutDetails(hangoutId, userSessions[0].token)
    
    console.log('Hangout state:', {
      state: hangoutDetails.hangout?.state,
      requiresVoting: hangoutDetails.hangout?.requiresVoting,
      requiresRSVP: hangoutDetails.hangout?.requiresRSVP,
      votes: hangoutDetails.hangout?.votes,
      optionVoteCounts: hangoutDetails.hangout?.optionVoteCounts,
      finalizedOption: hangoutDetails.hangout?.finalizedOption
    })
    
    // Check if consensus was reached
    if (hangoutDetails.hangout?.finalizedOption) {
      console.log('✅ Consensus reached! Hangout moved to RSVP stage')
      console.log('Finalized option:', hangoutDetails.hangout.finalizedOption)
    } else {
      console.log('⚠️ Consensus not reached yet')
      console.log('Vote counts:', hangoutDetails.hangout?.optionVoteCounts)
    }
    
    // Test individual vote retrieval
    console.log('🔍 Testing individual vote retrieval...')
    for (const session of userSessions) {
      const voteResponse = await session.page.evaluate(async ({ hangoutId, token }) => {
        const res = await fetch(`/api/hangouts/${hangoutId}/vote`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        return {
          status: res.status,
          data: await res.json()
        }
      }, { hangoutId, token: session.token })
      
      console.log(`User ${session.user.username} vote:`, voteResponse.data)
    }
    
    console.log('🎉 Voting system test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Run the test
testVotingSystem().catch(console.error)






