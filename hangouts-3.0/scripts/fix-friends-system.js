#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFriendsSystem() {
  console.log('👥 Fixing friends system...');
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, name: true }
    });
    
    console.log(`📊 Found ${users.length} active users`);
    
    if (users.length < 2) {
      console.log('⚠️ Not enough users to create friendships');
      return;
    }
    
    // Clear existing friendships and friend requests
    console.log('🧹 Clearing existing friendships and friend requests...');
    await prisma.friendship.deleteMany({});
    await prisma.friendRequest.deleteMany({});
    console.log('✅ Cleared existing data');
    
    // Create friendships between all users (except self)
    console.log('🔗 Creating friendships between all users...');
    const friendships = [];
    
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];
        
        // Create bidirectional friendships
        friendships.push(
          {
            id: `friendship_${user1.id}_${user2.id}`,
            userId: user1.id,
            friendId: user2.id,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: `friendship_${user2.id}_${user1.id}`,
            userId: user2.id,
            friendId: user1.id,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        );
      }
    }
    
    // Insert all friendships
    await prisma.friendship.createMany({
      data: friendships,
      skipDuplicates: true
    });
    
    console.log(`✅ Created ${friendships.length} friendship records`);
    
    // Verify friendships were created
    const friendshipCount = await prisma.friendship.count();
    console.log(`📊 Total friendships in database: ${friendshipCount}`);
    
    // Test: Get friends for first user
    const firstUser = users[0];
    const userFriends = await prisma.friendship.findMany({
      where: { userId: firstUser.id },
      include: {
        friend: {
          select: { id: true, username: true, name: true }
        }
      }
    });
    
    console.log(`👤 ${firstUser.username} has ${userFriends.length} friends:`);
    userFriends.forEach(friendship => {
      console.log(`  - ${friendship.friend.username} (${friendship.friend.name})`);
    });
    
    console.log('✅ Friends system fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing friends system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixFriendsSystem().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});















