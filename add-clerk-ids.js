const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function addClerkIdsToUsers() {
  try {
    console.log('Adding Clerk IDs to existing users...\n');
    
    // Get users without Clerk IDs
    const usersWithoutClerkId = await db.user.findMany({
      where: {
        clerkId: null
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true
      }
    });
    
    console.log(`Found ${usersWithoutClerkId.length} users without Clerk IDs:`);
    usersWithoutClerkId.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username}) - ${user.email}`);
    });
    
    // Generate mock Clerk IDs for testing
    const mockClerkIds = [
      'user_mock_alice123',
      'user_mock_bob456', 
      'user_mock_charlie789',
      'user_mock_diana012',
      'user_mock_eve345',
      'user_mock_dev678'
    ];
    
    console.log('\nAdding mock Clerk IDs...');
    
    for (let i = 0; i < usersWithoutClerkId.length && i < mockClerkIds.length; i++) {
      const user = usersWithoutClerkId[i];
      const clerkId = mockClerkIds[i];
      
      await db.user.update({
        where: { id: user.id },
        data: { clerkId: clerkId }
      });
      
      console.log(`✓ Added Clerk ID ${clerkId} to ${user.name}`);
    }
    
    // Verify the updates
    const updatedUsers = await db.user.findMany({
      where: {
        clerkId: { not: null }
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        name: true
      }
    });
    
    console.log(`\nTotal users with Clerk IDs: ${updatedUsers.length}`);
    updatedUsers.forEach(user => {
      console.log(`- ${user.name} (@${user.username}) - ${user.clerkId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

addClerkIdsToUsers();
