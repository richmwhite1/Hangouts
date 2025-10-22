// Database debug script to check friends and users
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function debugDatabase() {
  console.log('🔍 Database Debug Script Starting...\n');

  try {
    // Test 1: Check if database is connected
    console.log('1. Testing database connection...');
    await db.$connect();
    console.log('✅ Database connected successfully\n');

    // Test 2: Count users
    console.log('2. Checking users...');
    const userCount = await db.user.count();
    console.log(`✅ Found ${userCount} users in database\n`);

    // Test 3: List all users
    console.log('3. Listing all users...');
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true
      },
      take: 10
    });
    
    console.log('Users found:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (@${user.username}) - ${user.email} - Active: ${user.isActive}`);
    });
    console.log('');

    // Test 4: Check friendships
    console.log('4. Checking friendships...');
    const friendshipCount = await db.friendship.count();
    console.log(`✅ Found ${friendshipCount} friendships in database\n`);

    if (friendshipCount > 0) {
      const friendships = await db.friendship.findMany({
        include: {
          user: {
            select: { id: true, name: true, username: true }
          },
          friend: {
            select: { id: true, name: true, username: true }
          }
        },
        take: 5
      });

      console.log('Sample friendships:');
      friendships.forEach((friendship, index) => {
        console.log(`  ${index + 1}. ${friendship.user.name} ↔ ${friendship.friend.name} (Status: ${friendship.status})`);
      });
      console.log('');
    }

    // Test 5: Check friend requests
    console.log('5. Checking friend requests...');
    const requestCount = await db.friendRequest.count();
    console.log(`✅ Found ${requestCount} friend requests in database\n`);

    if (requestCount > 0) {
      const requests = await db.friendRequest.findMany({
        include: {
          sender: {
            select: { id: true, name: true, username: true }
          },
          receiver: {
            select: { id: true, name: true, username: true }
          }
        },
        take: 5
      });

      console.log('Sample friend requests:');
      requests.forEach((request, index) => {
        console.log(`  ${index + 1}. ${request.sender.name} → ${request.receiver.name} (Status: ${request.status})`);
      });
      console.log('');
    }

    // Test 6: Check hangouts
    console.log('6. Checking hangouts...');
    const hangoutCount = await db.content.count({
      where: { type: 'HANGOUT' }
    });
    console.log(`✅ Found ${hangoutCount} hangouts in database\n`);

    // Test 7: Check events
    console.log('7. Checking events...');
    const eventCount = await db.content.count({
      where: { type: 'EVENT' }
    });
    console.log(`✅ Found ${eventCount} events in database\n`);

    // Test 8: Test friends search query
    console.log('8. Testing friends search query...');
    const testUserId = users[0]?.id;
    if (testUserId) {
      console.log(`Testing with user: ${users[0].name} (${testUserId})`);
      
      // Simulate the friends search query
      const searchUsers = await db.user.findMany({
        where: {
          id: { not: testUserId }
        },
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isActive: true
        },
        take: 5
      });

      console.log('Users found in search:');
      searchUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (@${user.username}) - Active: ${user.isActive}`);
      });
      console.log('');

      // Check friendship status for these users
      const userIds = searchUsers.map(u => u.id);
      const friendships = await db.friendship.findMany({
        where: {
          userId: testUserId,
          friendId: { in: userIds },
          status: 'ACTIVE'
        }
      });

      console.log(`Found ${friendships.length} existing friendships with these users`);
    }

    console.log('🎉 Database debug completed successfully!');

  } catch (error) {
    console.error('❌ Database debug failed:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the debug script
debugDatabase();



























