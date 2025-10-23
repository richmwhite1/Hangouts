const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function testRSVPAutoJoin() {
  try {
    console.log('🧪 Testing RSVP Auto-Join Functionality...\n')

    // Find a test hangout
    const hangout = await db.content.findFirst({
      where: { type: 'HANGOUT' },
      include: {
        content_participants: true,
        rsvps: true
      }
    })

    if (!hangout) {
      console.log('❌ No hangouts found to test with')
      return
    }

    console.log(`📅 Testing with hangout: "${hangout.title}"`)
    console.log(`🆔 Hangout ID: ${hangout.id}`)
    console.log(`👥 Current participants: ${hangout.content_participants.length}`)
    console.log(`📝 Current RSVPs: ${hangout.rsvps.length}`)

    // Test user ID (you can replace this with a real user ID)
    const testUserId = 'test_user_123'

    // Check if user is already a participant
    const existingParticipant = await db.content_participants.findFirst({
      where: {
        contentId: hangout.id,
        userId: testUserId
      }
    })

    console.log(`\n🔍 Checking if user ${testUserId} is already a participant:`)
    console.log(existingParticipant ? '✅ User is already a participant' : '❌ User is not a participant')

    // Check if user has an RSVP
    const existingRSVP = await db.rsvp.findFirst({
      where: {
        contentId: hangout.id,
        userId: testUserId
      }
    })

    console.log(`\n🔍 Checking if user ${testUserId} has an RSVP:`)
    console.log(existingRSVP ? `✅ User has RSVP: ${existingRSVP.status}` : '❌ User has no RSVP')

    // Simulate the RSVP process (this is what happens in the API)
    console.log(`\n🔄 Simulating RSVP process for user ${testUserId}...`)

    // Step 1: Check if user is a participant, if not, add them
    let participant = existingParticipant
    if (!participant) {
      console.log('➕ Adding user as participant...')
      participant = await db.content_participants.create({
        data: {
          id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout.id,
          userId: testUserId,
          role: 'MEMBER',
          canEdit: false,
          isMandatory: false,
          isCoHost: false,
          joinedAt: new Date()
        }
      })
      console.log('✅ User added as participant')
    } else {
      console.log('✅ User was already a participant')
    }

    // Step 2: Create or update RSVP
    let rsvp
    if (existingRSVP) {
      console.log('🔄 Updating existing RSVP...')
      rsvp = await db.rsvp.update({
        where: { id: existingRSVP.id },
        data: {
          status: 'YES',
          respondedAt: new Date()
        }
      })
      console.log('✅ RSVP updated to YES')
    } else {
      console.log('➕ Creating new RSVP...')
      rsvp = await db.rsvp.create({
        data: {
          contentId: hangout.id,
          userId: testUserId,
          status: 'YES',
          respondedAt: new Date()
        }
      })
      console.log('✅ RSVP created as YES')
    }

    // Verify the results
    console.log(`\n✅ Verification:`)
    console.log(`👥 Total participants now: ${(await db.content_participants.count({ where: { contentId: hangout.id } }))}`)
    console.log(`📝 Total RSVPs now: ${(await db.rsvp.count({ where: { contentId: hangout.id } }))}`)

    // Check the specific user's status
    const finalParticipant = await db.content_participants.findFirst({
      where: {
        contentId: hangout.id,
        userId: testUserId
      }
    })

    const finalRSVP = await db.rsvp.findFirst({
      where: {
        contentId: hangout.id,
        userId: testUserId
      }
    })

    console.log(`\n🎯 Final Status for user ${testUserId}:`)
    console.log(`👤 Participant: ${finalParticipant ? '✅ Yes' : '❌ No'}`)
    console.log(`📝 RSVP Status: ${finalRSVP ? finalRSVP.status : 'None'}`)

    console.log('\n✅ RSVP Auto-Join test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await db.$disconnect()
  }
}

testRSVPAutoJoin()








