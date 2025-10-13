const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function testVotingFunctionality() {
  try {
    console.log('🧪 Testing voting functionality...')
    
    // 1. Create a test user
    const testUser = await db.user.create({
      data: {
        id: 'test_voter_' + Date.now(),
        clerkId: 'test_voter_' + Date.now(),
        email: 'testvoter@example.com',
        username: 'testvoter',
        name: 'Test Voter',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Test user created:', testUser.id)
    
    // 2. Create a test hangout with multiple options
    const hangout = await db.content.create({
      data: {
        id: 'test_hangout_' + Date.now(),
        type: 'HANGOUT',
        title: 'Test Voting Hangout',
        description: 'Testing voting functionality',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: testUser.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 27 * 60 * 60 * 1000), // Tomorrow + 3 hours
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Test hangout created:', hangout.id)
    
    // 3. Add creator as participant
    await db.content_participants.create({
      data: {
        id: 'participant_' + Date.now(),
        contentId: hangout.id,
        userId: testUser.id,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: true,
        isCoHost: false,
        joinedAt: new Date()
      }
    })
    console.log('✅ Creator added as participant')
    
    // 4. Create a poll with multiple options
    const poll = await db.polls.create({
      data: {
        id: 'poll_' + Date.now(),
        contentId: hangout.id,
        creatorId: testUser.id,
        title: 'Test Voting Poll',
        description: 'Testing voting functionality',
        options: [
          { id: 'option1', title: 'Option 1', description: 'First option' },
          { id: 'option2', title: 'Option 2', description: 'Second option' },
          { id: 'option3', title: 'Option 3', description: 'Third option' }
        ],
        allowMultiple: true,
        isAnonymous: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        consensusPercentage: 70,
        minimumParticipants: 1, // Low threshold for testing
        consensusType: 'percentage',
        status: 'ACTIVE',
        allowDelegation: false,
        allowAbstention: true,
        allowAddOptions: true,
        isPublic: true,
        visibility: 'PUBLIC'
      }
    })
    console.log('✅ Poll created with options:', poll.options.length)
    
    // 5. Test voting by casting votes
    console.log('🗳️ Testing vote casting...')
    
    // Vote for option 1
    const vote1 = await db.pollVote.create({
      data: {
        id: 'vote1_' + Date.now(),
        pollId: poll.id,
        userId: testUser.id,
        option: 'option1'
      }
    })
    console.log('✅ Vote 1 cast for option1')
    
    // Vote for option 2 (multiple voting)
    const vote2 = await db.pollVote.create({
      data: {
        id: 'vote2_' + Date.now(),
        pollId: poll.id,
        userId: testUser.id,
        option: 'option2',
        isPreferred: true
      }
    })
    console.log('✅ Vote 2 cast for option2 (preferred)')
    
    // 6. Test consensus detection
    console.log('🎯 Testing consensus detection...')
    
    // Get updated poll with votes
    const updatedPoll = await db.polls.findUnique({
      where: { id: poll.id },
      include: {
        votes: true
      }
    })
    
    console.log('📊 Poll votes:', updatedPoll.votes.length)
    console.log('📊 Vote details:', updatedPoll.votes.map(v => ({
      option: v.option,
      userId: v.userId,
      isPreferred: v.isPreferred
    })))
    
    // 7. Test hangout API response structure
    console.log('🔍 Testing hangout API response structure...')
    
    const hangoutWithData = await db.content.findUnique({
      where: { id: hangout.id },
      include: {
        polls: {
          include: {
            votes: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    })
    
    // Build votes object like the API does
    const votes = {}
    hangoutWithData.polls[0].votes.forEach(vote => {
      if (!votes[vote.userId]) {
        votes[vote.userId] = []
      }
      votes[vote.userId].push(vote.option)
    })
    
    console.log('📊 API votes structure:', votes)
    console.log('📊 User votes for test user:', votes[testUser.id])
    
    // 8. Test consensus logic
    const votedCount = Object.keys(votes).filter(userId => votes[userId] && votes[userId].length > 0).length
    const participants = hangoutWithData.content_participants || []
    const minVotesRequired = Math.max(1, Math.ceil(participants.length * 0.5))
    
    console.log('📊 Voted count:', votedCount)
    console.log('📊 Participants count:', participants.length)
    console.log('📊 Min votes required:', minVotesRequired)
    console.log('📊 Consensus reached:', votedCount >= minVotesRequired)
    
    console.log('🎉 Voting functionality test completed successfully!')
    
    // Cleanup
    console.log('🧹 Cleaning up test data...')
    await db.pollVote.deleteMany({ where: { pollId: poll.id } })
    await db.polls.delete({ where: { id: poll.id } })
    await db.content_participants.deleteMany({ where: { contentId: hangout.id } })
    await db.content.delete({ where: { id: hangout.id } })
    await db.user.delete({ where: { id: testUser.id } })
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await db.$disconnect()
  }
}

testVotingFunctionality()