const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFriendshipTable() {
  try {
    console.log('🧪 Testing friendship table...\n');

    // Test 1: Check if friendship table exists
    console.log('1️⃣ Testing friendship table access...');
    try {
      const friendships = await prisma.friendship.findMany({
        take: 5
      });
      console.log(`✅ Friendship table accessible: Found ${friendships.length} records`);
      
      if (friendships.length > 0) {
        console.log('Sample friendship:', friendships[0]);
      }
    } catch (error) {
      console.log('❌ Friendship table error:', error.message);
    }

    // Test 2: Check specific user's friendships
    console.log('\n2️⃣ Testing specific user friendships...');
    const user = await prisma.user.findFirst();
    if (user) {
      console.log(`Testing with user: ${user.username} (${user.id})`);
      
      try {
        const userFriends = await prisma.friendship.findMany({
          where: {
            OR: [
              { userId: user.id },
              { friendId: user.id }
            ]
          },
          select: {
            userId: true,
            friendId: true,
            status: true
          }
        });
        
        console.log(`✅ User friendships query successful: Found ${userFriends.length} friendships`);
        
        const friendIds = userFriends.map(friend => 
          friend.userId === user.id ? friend.friendId : friend.userId
        );
        
        console.log(`✅ Friend IDs extracted: ${friendIds.length} friends`);
        console.log('Friend IDs:', friendIds);
        
      } catch (error) {
        console.log('❌ User friendships query error:', error.message);
      }
    }

    // Test 3: Check content table
    console.log('\n3️⃣ Testing content table...');
    try {
      const contents = await prisma.content.findMany({
        where: { type: 'HANGOUT' },
        take: 5
      });
      console.log(`✅ Content table accessible: Found ${contents.length} hangouts`);
    } catch (error) {
      console.log('❌ Content table error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error during friendship table test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFriendshipTable();




