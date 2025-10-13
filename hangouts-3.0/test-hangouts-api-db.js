const { PrismaClient } = require('@prisma/client');

async function testHangoutsAPI() {
  const db = new PrismaClient();
  
  try {
    console.log('Testing hangouts API database operations...');
    
    // Test user creation
    const testUser = await db.user.create({
      data: {
        id: 'test_user_api_' + Date.now(),
        clerkId: 'test_clerk_api_' + Date.now(),
        email: 'testapi@example.com',
        username: 'testuserapi_' + Date.now(),
        name: 'Test API User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Test user created:', testUser.id);
    
    // Test hangout creation
    const testHangout = await db.content.create({
      data: {
        id: 'test_hangout_api_' + Date.now(),
        type: 'HANGOUT',
        title: 'Test API Hangout',
        description: 'This is a test hangout for API testing',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Test hangout created:', testHangout.id);
    
    // Test participant creation
    const testParticipant = await db.content_participants.create({
      data: {
        id: 'test_participant_api_' + Date.now(),
        contentId: testHangout.id,
        userId: testUser.id,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: true,
        isCoHost: false,
        joinedAt: new Date()
      }
    });
    console.log('✅ Test participant created:', testParticipant.id);
    
    // Test poll creation
    const testPoll = await db.polls.create({
      data: {
        id: 'test_poll_api_' + Date.now(),
        contentId: testHangout.id,
        creatorId: testUser.id,
        title: 'Test Poll',
        description: 'Test poll description',
        options: [
          { id: 'opt1', title: 'Option 1', description: 'First option' },
          { id: 'opt2', title: 'Option 2', description: 'Second option' }
        ],
        allowMultiple: true,
        isAnonymous: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    });
    console.log('✅ Test poll created:', testPoll.id);
    
    // Clean up
    await db.polls.delete({ where: { id: testPoll.id } });
    await db.content_participants.delete({ where: { id: testParticipant.id } });
    await db.content.delete({ where: { id: testHangout.id } });
    await db.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 All database operations PASSED!');
    
  } catch (error) {
    console.error('❌ Database operation FAILED:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

testHangoutsAPI();
