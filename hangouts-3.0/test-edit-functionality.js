const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testEditFunctionality() {
  try {
    console.log('🧪 Testing hangout edit functionality...')
    
    // Find a hangout in voting state
    const votingHangout = await prisma.content.findFirst({
      where: {
        type: 'HANGOUT',
        state: 'POLLING'
      },
      include: {
        polls: {
          include: {
            votes: true
          }
        }
      }
    })
    
    if (votingHangout) {
      console.log('✅ Found voting hangout:', votingHangout.title)
      console.log('   - State:', votingHangout.state)
      console.log('   - Privacy Level:', votingHangout.privacyLevel)
      console.log('   - Has polls:', votingHangout.polls.length > 0)
      
      // Test updating privacy level
      const updatedHangout = await prisma.content.update({
        where: { id: votingHangout.id },
        data: {
          privacyLevel: 'FRIENDS_ONLY',
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Successfully updated privacy level to:', updatedHangout.privacyLevel)
    } else {
      console.log('❌ No voting hangouts found')
    }
    
    // Find a hangout in RSVP state
    const rsvpHangout = await prisma.content.findFirst({
      where: {
        type: 'HANGOUT',
        state: 'CONFIRMED'
      }
    })
    
    if (rsvpHangout) {
      console.log('✅ Found RSVP hangout:', rsvpHangout.title)
      console.log('   - State:', rsvpHangout.state)
      console.log('   - Privacy Level:', rsvpHangout.privacyLevel)
      
      // Test updating privacy level
      const updatedHangout = await prisma.content.update({
        where: { id: rsvpHangout.id },
        data: {
          privacyLevel: 'PUBLIC',
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Successfully updated privacy level to:', updatedHangout.privacyLevel)
    } else {
      console.log('❌ No RSVP hangouts found')
    }
    
    console.log('🎉 Edit functionality test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEditFunctionality()
