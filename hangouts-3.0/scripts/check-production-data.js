const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductionData() {
  try {
    console.log('🔍 Checking production data...');

    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true
      }
    });
    console.log(`👥 Users found: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Created: ${user.createdAt}`);
    });

    // Check friendships
    const friendships = await prisma.friendship.findMany({
      include: {
        user: { select: { name: true } },
        friend: { select: { name: true } }
      }
    });
    console.log(`🤝 Friendships found: ${friendships.length}`);
    friendships.forEach(friendship => {
      console.log(`   - ${friendship.user.name} ↔ ${friendship.friend.name}`);
    });

    // Check content (events and hangouts)
    const content = await prisma.content.findMany({
      select: {
        id: true,
        type: true,
        title: true,
        creatorId: true,
        createdAt: true,
        status: true,
        startTime: true,
        endTime: true,
        location: true
      }
    });
    console.log(`📄 Content found: ${content.length}`);
    content.forEach(item => {
      console.log(`   - ${item.type}: ${item.title} (ID: ${item.id}) (Creator ID: ${item.creatorId}) - Status: ${item.status} - Created: ${item.createdAt}`);
    });

    // Check for potentially broken content (missing required fields)
    const brokenContent = await prisma.content.findMany({
      where: {
        OR: [
          { title: null },
          { title: '' },
          { creatorId: null },
          { type: null }
        ]
      }
    });
    
    if (brokenContent.length > 0) {
      console.log(`⚠️  Found ${brokenContent.length} potentially broken content items:`);
      brokenContent.forEach(item => {
        console.log(`   - ID: ${item.id}, Type: ${item.type}, Title: "${item.title}", Creator: ${item.creatorId}`);
      });
    }

    // Check polls
    const polls = await prisma.polls.findMany({
      select: {
        id: true,
        title: true,
        contentId: true,
        createdAt: true
      }
    });
    console.log(`🗳️ Polls found: ${polls.length}`);
    polls.forEach(poll => {
      console.log(`   - ${poll.title} (Content ID: ${poll.contentId})`);
    });

    // Check RSVPs
    const rsvps = await prisma.rsvp.findMany({
      select: {
        id: true,
        contentId: true,
        userId: true,
        status: true,
        createdAt: true
      }
    });
    console.log(`📝 RSVPs found: ${rsvps.length}`);
    rsvps.forEach(rsvp => {
      console.log(`   - User ID: ${rsvp.userId} → Content ID: ${rsvp.contentId} (${rsvp.status})`);
    });

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionData();
