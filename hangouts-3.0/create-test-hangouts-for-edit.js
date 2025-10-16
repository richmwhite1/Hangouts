const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestHangouts() {
  try {
    console.log('🧪 Creating test hangouts for edit functionality...')
    
    // Create a voting hangout
    const votingHangout = await prisma.content.create({
      data: {
        id: `hangout_voting_${Date.now()}`,
        title: 'Hiking Mount Olympus - Voting',
        description: 'Let\'s vote on the best time to hike Mount Olympus!',
        location: 'Mount Olympus, Greece',
        type: 'HANGOUT',
        state: 'POLLING',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        creatorId: 'cmgmn9m6y0000jp24wr3mjg8p',
        weatherEnabled: true,
        maxParticipants: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Created voting hangout:', votingHangout.title)
    
    // Create a poll for the voting hangout
    const poll = await prisma.polls.create({
      data: {
        id: `poll_${Date.now()}`,
        contentId: votingHangout.id,
        creatorId: 'cmgmn9m6y0000jp24wr3mjg8p',
        title: 'Hiking Mount Olympus - Time Options',
        description: 'Choose your preferred time for hiking Mount Olympus',
        options: [
          {
            id: 'option_1',
            title: 'Early Morning (6 AM)',
            description: 'Start early to avoid crowds',
            location: 'Mount Olympus Base Camp',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            price: 0
          },
          {
            id: 'option_2', 
            title: 'Mid Morning (9 AM)',
            description: 'More relaxed start time',
            location: 'Mount Olympus Base Camp',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
            price: 0
          },
          {
            id: 'option_3',
            title: 'Afternoon (2 PM)',
            description: 'Late start for those who prefer it',
            location: 'Mount Olympus Base Camp', 
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
            price: 0
          }
        ],
        allowMultiple: false,
        isAnonymous: false,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        consensusPercentage: 70,
        minimumParticipants: 2,
        consensusType: 'percentage',
        status: 'ACTIVE',
        allowDelegation: false,
        allowAbstention: true,
        allowAddOptions: true,
        isPublic: true,
        visibility: 'PUBLIC'
      }
    })
    
    console.log('✅ Created poll with', poll.options.length, 'options')
    
    // Create an RSVP hangout
    const rsvpHangout = await prisma.content.create({
      data: {
        id: `hangout_rsvp_${Date.now()}`,
        title: 'Coffee Meetup - RSVP',
        description: 'Let\'s grab coffee and catch up!',
        location: 'Downtown Coffee Shop',
        type: 'HANGOUT',
        state: 'CONFIRMED',
        privacyLevel: 'FRIENDS_ONLY',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        creatorId: 'cmgmn9m6y0000jp24wr3mjg8p',
        weatherEnabled: false,
        maxParticipants: 6,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Created RSVP hangout:', rsvpHangout.title)
    
    console.log('🎉 Test hangouts created successfully!')
    console.log('Voting hangout ID:', votingHangout.id)
    console.log('RSVP hangout ID:', rsvpHangout.id)
    
  } catch (error) {
    console.error('❌ Failed to create test hangouts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestHangouts()
