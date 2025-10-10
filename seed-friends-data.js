const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedFriendsData() {
  try {
    console.log('🌱 Seeding friends data...\n');

    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);

    if (users.length < 2) {
      console.log('❌ Need at least 2 users to create friendships');
      return;
    }

    // Create friendships between all users (everyone is friends with everyone)
    const friendships = [];
    
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        // Create bidirectional friendship
        friendships.push(
          {
            id: `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}_${j}`,
            userId: users[i].id,
            friendId: users[j].id,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${j}_${i}`,
            userId: users[j].id,
            friendId: users[i].id,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        );
      }
    }

    // Clear existing friendships first
    await prisma.friendship.deleteMany();
    console.log('✅ Cleared existing friendships');

    // Create new friendships
    await prisma.friendship.createMany({
      data: friendships
    });

    console.log(`✅ Created ${friendships.length} friendship records`);
    console.log(`✅ Each user now has ${users.length - 1} friends`);

    // Verify friendships
    const friendshipCount = await prisma.friendship.count();
    console.log(`✅ Total friendships in database: ${friendshipCount}`);

    // Show sample friendships for first user
    const firstUser = users[0];
    const userFriendships = await prisma.friendship.findMany({
      where: { userId: firstUser.id },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    console.log(`\n👥 Friends of ${firstUser.username}:`);
    userFriendships.forEach(friendship => {
      console.log(`  - ${friendship.friend.username} (${friendship.friend.name})`);
    });

    console.log('\n🎉 Friends data seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding friends data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedFriendsData().catch(console.error);
