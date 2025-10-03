const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFeedAPI() {
  try {
    console.log('🧪 Testing Feed API logic...');

    // Test discover feed (no auth required)
    console.log('\n📱 Testing DISCOVER feed...');
    const discoverContent = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { privacyLevel: 'PUBLIC' }
        ]
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        image: true,
        location: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Discover feed found ${discoverContent.length} items:`);
    discoverContent.forEach(item => {
      console.log(`   - ${item.type}: ${item.title}`);
    });

    // Test with a specific user (Alice)
    const alice = await prisma.user.findFirst({
      where: { email: 'alice@example.com' }
    });

    if (alice) {
      console.log(`\n👤 Testing HOME feed for ${alice.name}...`);
      
      // Get Alice's friends
      const userFriends = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId: alice.id },
            { friendId: alice.id }
          ]
        },
        select: {
          userId: true,
          friendId: true
        }
      });

      const friendIds = userFriends.map(friend => 
        friend.userId === alice.id ? friend.friendId : friend.userId
      );

      console.log(`   Friends found: ${friendIds.length}`);

      // Test home feed query
      const homeContent = await prisma.content.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { creatorId: alice.id },
            {
              content_participants: {
                some: { userId: alice.id }
              }
            },
            {
              eventSaves: {
                some: { userId: alice.id }
              }
            },
            {
              rsvps: {
                some: { 
                  userId: alice.id,
                  status: { in: ['YES', 'MAYBE'] }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          image: true,
          location: true,
          startTime: true,
          endTime: true,
          privacyLevel: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      console.log(`✅ Home feed found ${homeContent.length} items:`);
      homeContent.forEach(item => {
        console.log(`   - ${item.type}: ${item.title}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing feed API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeedAPI();
