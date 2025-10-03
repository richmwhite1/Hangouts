const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFriendsAPI() {
  try {
    console.log('🧪 Testing Friends API...');

    // Find the user that's currently logged in (cmgaarzou0000o50f6pxaekfh)
    const currentUser = await prisma.user.findFirst({
      where: { id: 'cmgaarzou0000o50f6pxaekfh' }
    });

    if (currentUser) {
      console.log(`👤 Current user: ${currentUser.name} (${currentUser.email})`);

      // Get their friendships
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId: currentUser.id },
            { friendId: currentUser.id }
          ]
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          friend: { select: { id: true, name: true, email: true, avatar: true } }
        }
      });

      console.log(`🤝 Found ${friendships.length} friendships:`);
      friendships.forEach(friendship => {
        const friend = friendship.userId === currentUser.id ? friendship.friend : friendship.user;
        console.log(`   - ${friend.name} (${friend.email})`);
      });

      // If no friends, let's add some
      if (friendships.length === 0) {
        console.log('\n🔧 Adding friends for current user...');
        
        // Get some of our seeded users
        const seededUsers = await prisma.user.findMany({
          where: {
            email: {
              in: ['alice@example.com', 'bob@example.com', 'charlie@example.com']
            }
          }
        });

        for (const friend of seededUsers) {
          try {
            await prisma.friendship.create({
              data: {
                userId: currentUser.id,
                friendId: friend.id,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            console.log(`✅ Added friendship with ${friend.name}`);
          } catch (error) {
            console.log(`⚠️  Friendship already exists or error: ${error.message}`);
          }
        }
      }

    } else {
      console.log('❌ Current user not found');
    }

  } catch (error) {
    console.error('❌ Error testing friends API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFriendsAPI();