const fetch = require('node-fetch')

async function testEditAPI() {
  try {
    console.log('🧪 Testing edit API functionality...')
    
    // Test updating voting hangout privacy
    const votingHangoutId = 'hangout_voting_1760633296140'
    console.log('Testing voting hangout edit:', votingHangoutId)
    
    const votingUpdateResponse = await fetch(`http://localhost:3000/api/hangouts/${votingHangoutId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the structure
      },
      body: JSON.stringify({
        title: 'Hiking Mount Olympus - Voting (Updated)',
        description: 'Updated description for voting hangout',
        privacyLevel: 'FRIENDS_ONLY',
        location: 'Mount Olympus, Greece (Updated)'
      })
    })
    
    console.log('Voting hangout update response status:', votingUpdateResponse.status)
    const votingResult = await votingUpdateResponse.text()
    console.log('Voting hangout update response:', votingResult.substring(0, 200) + '...')
    
    // Test updating RSVP hangout privacy
    const rsvpHangoutId = 'hangout_rsvp_1760633296165'
    console.log('Testing RSVP hangout edit:', rsvpHangoutId)
    
    const rsvpUpdateResponse = await fetch(`http://localhost:3000/api/hangouts/${rsvpHangoutId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the structure
      },
      body: JSON.stringify({
        title: 'Coffee Meetup - RSVP (Updated)',
        description: 'Updated description for RSVP hangout',
        privacyLevel: 'PUBLIC',
        location: 'Downtown Coffee Shop (Updated)'
      })
    })
    
    console.log('RSVP hangout update response status:', rsvpUpdateResponse.status)
    const rsvpResult = await rsvpUpdateResponse.text()
    console.log('RSVP hangout update response:', rsvpResult.substring(0, 200) + '...')
    
    console.log('🎉 Edit API test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testEditAPI()
