const puppeteer = require('puppeteer-core')

const BASE_URL = 'https://hangouts-production-adc4.up.railway.app'

async function testVotingSystem() {
  console.log('🚀 Starting voting system test...')
  
  let browser
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Sign in
    console.log('🔐 Signing in...')
    await page.goto(`${BASE_URL}/signin`)
    await page.waitForSelector('input[name="username"]', { timeout: 10000 })
    
    await page.type('input[name="username"]', 'richardwhite')
    await page.type('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForNavigation({ timeout: 10000 })
    
    // Get token
    const token = await page.evaluate(() => localStorage.getItem('token'))
    console.log('✅ Signed in successfully')
    
    // Create a test hangout with multiple options
    console.log('🏗️ Creating test hangout...')
    const createResponse = await page.evaluate(async ({ token }) => {
      const response = await fetch('/api/hangouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Voting Test Hangout',
          description: 'Testing voting system',
          type: 'HANGOUT',
          privacyLevel: 'PUBLIC',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          location: 'Test Location',
          options: [
            {
              id: 'option_1',
              title: 'Option 1: Movie',
              description: 'Watch a movie',
              location: 'Cinema',
              dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              price: 15
            },
            {
              id: 'option_2',
              title: 'Option 2: Dinner',
              description: 'Have dinner',
              location: 'Restaurant',
              dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              price: 25
            }
          ],
          requiresVoting: true,
          requiresRSVP: true,
          maxParticipants: 10
        })
      })
      
      return {
        status: response.status,
        data: await response.json()
      }
    }, { token })
    
    if (createResponse.status !== 200) {
      throw new Error(`Failed to create hangout: ${createResponse.status} - ${JSON.stringify(createResponse.data)}`)
    }
    
    const hangoutId = createResponse.data.data.id
    console.log('✅ Test hangout created:', hangoutId)
    
    // Navigate to hangout page
    console.log('🔍 Navigating to hangout page...')
    await page.goto(`${BASE_URL}/hangout/${hangoutId}`)
    await page.waitForSelector('[data-testid="voting-section"]', { timeout: 10000 })
    
    // Check initial state
    console.log('📊 Checking initial hangout state...')
    const initialState = await page.evaluate(async ({ hangoutId, token }) => {
      const response = await fetch(`/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      return {
        state: data.hangout?.state,
        requiresVoting: data.hangout?.requiresVoting,
        votes: data.hangout?.votes,
        optionVoteCounts: data.hangout?.optionVoteCounts
      }
    }, { hangoutId, token })
    
    console.log('Initial state:', initialState)
    
    // Cast a vote
    console.log('🗳️ Casting vote for option 1...')
    const voteResponse = await page.evaluate(async ({ hangoutId, token }) => {
      const response = await fetch(`/api/hangouts/${hangoutId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionId: 'option_1' })
      })
      
      return {
        status: response.status,
        data: await response.json()
      }
    }, { hangoutId, token })
    
    console.log('Vote response:', voteResponse)
    
    if (voteResponse.status !== 200) {
      throw new Error(`Vote failed: ${voteResponse.status} - ${JSON.stringify(voteResponse.data)}`)
    }
    
    // Check state after vote
    console.log('📊 Checking state after vote...')
    const afterVoteState = await page.evaluate(async ({ hangoutId, token }) => {
      const response = await fetch(`/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      return {
        state: data.hangout?.state,
        requiresVoting: data.hangout?.requiresVoting,
        votes: data.hangout?.votes,
        optionVoteCounts: data.hangout?.optionVoteCounts,
        finalizedOption: data.hangout?.finalizedOption
      }
    }, { hangoutId, token })
    
    console.log('After vote state:', afterVoteState)
    
    // Check individual vote
    console.log('🔍 Checking individual vote...')
    const individualVote = await page.evaluate(async ({ hangoutId, token }) => {
      const response = await fetch(`/api/hangouts/${hangoutId}/vote`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      return {
        status: response.status,
        data: await response.json()
      }
    }, { hangoutId, token })
    
    console.log('Individual vote:', individualVote)
    
    console.log('🎉 Voting test completed!')
    
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



