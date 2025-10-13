const { PrismaClient } = require('@prisma/client');

async function testHangoutCreation() {
  const db = new PrismaClient();
  
  try {
    console.log('Testing hangout creation...');
    
    // First, create a test user
    const testUser = await db.user.create({
      data: {
        id: 'test_user_' + Date.now(),
        clerkId: 'test_clerk_' + Date.now(),
        email: 'test@example.com',
        username: 'testuser_' + Date.now(),
        name: 'Test User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Test user created:', testUser.id);
    
    // Create a test hangout
    const testHangout = await db.content.create({
      data: {
        id: 'test_hangout_' + Date.now(),
        type: 'HANGOUT',
        title: 'Test Hangout',
        description: 'This is a test hangout',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Test hangout created:', testHangout.id);
    
    // Add creator as participant
    await db.content_participants.create({
      data: {
        id: 'test_participant_' + Date.now(),
        contentId: testHangout.id,
        userId: testUser.id,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: true,
        isCoHost: false,
        joinedAt: new Date()
      }
    });
    console.log('Creator added as participant');
    
    // Clean up
    await db.content_participants.deleteMany({
      where: { contentId: testHangout.id }
    });
    await db.content.delete({ where: { id: testHangout.id } });
    await db.user.delete({ where: { id: testUser.id } });
    console.log('Test data cleaned up');
    
    console.log('✅ Hangout creation test PASSED!');
    
  } catch (error) {
    console.error('❌ Hangout creation test FAILED:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

testHangoutCreation();