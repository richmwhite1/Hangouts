const { PrismaClient } = require('@prisma/client');

async function testHangoutsAPIDirect() {
  const db = new PrismaClient();
  
  try {
    console.log('Testing hangouts API with direct data...');
    
    // Create a test user first
    const testUser = await db.user.create({
      data: {
        id: 'test_user_direct_' + Date.now(),
        clerkId: 'test_clerk_direct_' + Date.now(),
        email: 'testdirect@example.com',
        username: 'testuserdirect_' + Date.now(),
        name: 'Test Direct User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Test user created:', testUser.id);
    
    // Test data that matches the schema exactly
    const testData = {
      title: 'Test Direct Hangout',
      description: 'This is a test hangout created directly',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      participants: [],
      options: [
        {
          id: 'opt1',
          title: 'Option 1',
          description: 'First option',
          location: 'Location 1',
          dateTime: new Date().toISOString(),
          price: 0
        },
        {
          id: 'opt2',
          title: 'Option 2',
          description: 'Second option',
          location: 'Location 2',
          dateTime: new Date().toISOString(),
          price: 0
        }
      ]
    };
    
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    // Test the exact same operations the API does
    const startTime = new Date(testData.options[0].dateTime);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
    
    const hangout = await db.content.create({
      data: {
        id: 'test_hangout_direct_' + Date.now(),
        type: 'HANGOUT',
        title: testData.title,
        description: testData.description,
        status: 'PUBLISHED',
        privacyLevel: testData.privacyLevel,
        creatorId: testUser.id,
        startTime,
        endTime,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Test hangout created:', hangout.id);
    
    // Add creator as participant
    await db.content_participants.create({
      data: {
        id: 'test_participant_direct_' + Date.now(),
        contentId: hangout.id,
        userId: testUser.id,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: true,
        isCoHost: false,
        joinedAt: new Date()
      }
    });
    console.log('✅ Creator added as participant');
    
    // Create poll
    await db.polls.create({
      data: {
        id: 'test_poll_direct_' + Date.now(),
        contentId: hangout.id,
        creatorId: testUser.id,
        title: testData.title,
        description: testData.description,
        options: testData.options,
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
    console.log('✅ Test poll created');
    
    // Clean up
    await db.polls.deleteMany({ where: { contentId: hangout.id } });
    await db.content_participants.deleteMany({ where: { contentId: hangout.id } });
    await db.content.delete({ where: { id: hangout.id } });
    await db.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 Direct API test PASSED!');
    
  } catch (error) {
    console.error('❌ Direct API test FAILED:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

testHangoutsAPIDirect();
