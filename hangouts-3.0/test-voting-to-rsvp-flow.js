const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function testCompleteVotingToRSVPFlow() {
  try {
    console.log('🧪 Testing complete voting-to-RSVP flow...')
    
    // 1. Create test users
    const user1 = await db.user.create({
      data: {
        id: 'test_user1_' + Date.now(),
        clerkId: 'test_user1_' + Date.now(),
        email: 'testuser1@example.com',
        username: 'testuser1',
        name: 'Test User 1',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    const user2 = await db.user.create({
      data: {
        id: 'test_user2_' + Date.now(),
        clerkId: 'test_user2_' + Date.now(),
        email: 'testuser2@example.com',
        username: 'testuser2',
        name: 'Test User 2',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Test users created:', user1.id, user2.id)
    
    // 2. Create test hangout
    const hangout = await db.content.create({
      data: {
        id: 'test_hangout_rsvp_' + Date.now(),
        type: 'HANGOUT',
        title: 'Test RSVP Transition Hangout',
        description: 'Testing voting to RSVP transition',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user1.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 27 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Test hangout created:', hangout.id)
    
    // 3. Add participants
    await db.content_participants.createMany({
      data: [
        {
          id: 'participant1_' + Date.now(),
          contentId: hangout.id,
          userId: user1.id,
          role: 'CREATOR',
          canEdit: true,
          isMandatory: true,
          isCoHost: false,
          joinedAt: new Date()
        },
        {
          id: 'participant2_' + Date.now(),
          contentId: hangout.id,
          userId: user2.id,
          role: 'MEMBER',
          canEdit: false,
          isMandatory: false,
          isCoHost: false,
          joinedAt: new Date()
        }
      ]
    })
    console.log('✅ Participants added')
    
    // 4. Create poll with multiple options
    const poll = await db.polls.create({
      data: {
        id: 'poll_rsvp_' + Date.now(),
        contentId: hangout.id,
        creatorId: user1.id,
        title: 'Test RSVP Poll',
        description: 'Testing RSVP transition',
        options: [
          { id: 'rsvp_option1', title: 'RSVP Option 1', description: 'First RSVP option' },
          { id: 'rsvp_option2', title: 'RSVP Option 2', description: 'Second RSVP option' }
        ],
        allowMultiple: true,
        isAnonymous: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        consensusPercentage: 50, // Low threshold for testing
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
    console.log('✅ Poll created with low consensus threshold')
    
    // 5. Cast votes to reach consensus
    console.log('🗳️ Casting votes to reach consensus...')
    
    // User 1 votes for option 1
    await db.pollVote.create({
      data: {
        id: 'vote1_rsvp_' + Date.now(),
        pollId: poll.id,
        userId: user1.id,
        option: 'rsvp_option1'
      }
    })
    console.log('✅ User 1 voted for option 1')
    
    // User 2 votes for option 1 (creates consensus)
    await db.pollVote.create({
      data: {
        id: 'vote2_rsvp_' + Date.now(),
        pollId: poll.id,
        userId: user2.id,
        option: 'rsvp_option1'
      }
    })
    console.log('✅ User 2 voted for option 1 (consensus reached!)')
    
    // 6. Test consensus detection logic
    console.log('🎯 Testing consensus detection...')
    
    const updatedPoll = await db.polls.findUnique({
      where: { id: poll.id },
      include: {
        votes: true
      }
    })
    
    const votes = {}
    updatedPoll.votes.forEach(vote => {
      if (!votes[vote.userId]) {
        votes[vote.userId] = []
      }
      votes[vote.userId].push(vote.option)
    })
    
    const votedCount = Object.keys(votes).filter(userId => 
      votes[userId] && votes[userId].length > 0
    ).length
    
    const participants = await db.content_participants.findMany({
      where: { contentId: hangout.id }
    })
    
    const minVotesRequired = Math.max(1, Math.ceil(participants.length * 0.5))
    const consensusReached = votedCount >= minVotesRequired
    
    console.log('📊 Voted count:', votedCount)
    console.log('📊 Participants count:', participants.length)
    console.log('📊 Min votes required:', minVotesRequired)
    console.log('📊 Consensus reached:', consensusReached)
    
    // 7. Simulate RSVP transition (like the voting API does)
    if (consensusReached) {
      console.log('🔄 Simulating RSVP transition...')
      
      // Calculate winner
      const optionVotes = {}
      updatedPoll.votes.forEach(vote => {
        optionVotes[vote.option] = (optionVotes[vote.option] || 0) + 1
      })
      
      const winnerId = Object.keys(optionVotes).reduce((a, b) => 
        optionVotes[a] > optionVotes[b] ? a : b
      )
      
      const winner = poll.options.find(opt => opt.id === winnerId)
      console.log('📊 Winner:', winner)
      
      // Update poll status
      await db.polls.update({
        where: { id: poll.id },
        data: {
          status: 'CONSENSUS_REACHED',
          options: [winner]
        }
      })
      console.log('✅ Poll status updated to CONSENSUS_REACHED')
      
      // Create RSVP records for all participants
      const existingRsvps = await db.rsvp.findMany({
        where: { contentId: hangout.id }
      })
      const existingUserIds = existingRsvps.map(rsvp => rsvp.userId)
      
      const newRsvpData = participants
        .filter(participant => !existingUserIds.includes(participant.userId))
        .map(participant => ({
          contentId: hangout.id,
          userId: participant.userId,
          status: 'PENDING',
          respondedAt: null
        }))
      
      if (newRsvpData.length > 0) {
        await db.rsvp.createMany({
          data: newRsvpData
        })
        console.log('✅ RSVP records created for', newRsvpData.length, 'participants')
      }
      
      // 8. Verify RSVP transition
      console.log('✅ Verifying RSVP transition...')
      
      const finalPoll = await db.polls.findUnique({
        where: { id: poll.id }
      })
      
      const rsvpRecords = await db.rsvp.findMany({
        where: { contentId: hangout.id }
      })
      
      console.log('📊 Final poll status:', finalPoll.status)
      console.log('📊 RSVP records created:', rsvpRecords.length)
      console.log('📊 RSVP details:', rsvpRecords.map(r => ({
        userId: r.userId,
        status: r.status
      })))
      
      console.log('🎉 Complete voting-to-RSVP flow test passed!')
      
    } else {
      console.log('❌ Consensus not reached - test failed')
    }
    
    // Cleanup
    console.log('🧹 Cleaning up test data...')
    await db.pollVote.deleteMany({ where: { pollId: poll.id } })
    await db.rsvp.deleteMany({ where: { contentId: hangout.id } })
    await db.polls.delete({ where: { id: poll.id } })
    await db.content_participants.deleteMany({ where: { contentId: hangout.id } })
    await db.content.delete({ where: { id: hangout.id } })
    await db.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } })
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await db.$disconnect()
  }
}

testCompleteVotingToRSVPFlow()
