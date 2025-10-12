const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users in database...\n');
    
    const users = await db.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Total users: ${users.length}`);
    console.log('Users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId || 'None'}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    const clerkUsers = users.filter(u => u.clerkId);
    console.log(`Users with Clerk IDs: ${clerkUsers.length}`);
    
    const activeUsers = users.filter(u => u.isActive);
    console.log(`Active users: ${activeUsers.length}`);
    
    // Check friendships
    const friendships = await db.friendship.findMany({
      include: {
        user: { select: { name: true, username: true } },
        friend: { select: { name: true, username: true } }
      }
    });
    
    console.log(`\nTotal friendships: ${friendships.length}`);
    friendships.forEach(friendship => {
      console.log(`${friendship.user.name} <-> ${friendship.friend.name}`);
    });
    
    // Check friend requests
    const friendRequests = await db.friendRequest.findMany({
      include: {
        sender: { select: { name: true, username: true } },
        receiver: { select: { name: true, username: true } }
      }
    });
    
    console.log(`\nTotal friend requests: ${friendRequests.length}`);
    friendRequests.forEach(request => {
      console.log(`${request.sender.name} -> ${request.receiver.name} (${request.status})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkUsers();
