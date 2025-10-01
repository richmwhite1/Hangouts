const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFeedAPIDirect() {
  try {
    console.log('🧪 Testing feed API logic directly...\n');

    // Test the exact logic from the feed API
    const userId = null; // No authentication for discover page
    let friendIds = [];
    
    // Build where clause for discover feed
    const whereClause = {
      status: 'PUBLISHED',
      OR: [
        // Public content (everyone can see)
        { privacyLevel: 'PUBLIC' },
        // Friends-only content from user's friends (if authenticated)
        ...(userId && friendIds.length > 0 ? [{
          AND: [
            { privacyLevel: 'FRIENDS_ONLY' },
            { creatorId: { in: friendIds } }
          ]
        }] : [])
      ]
    };

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));

    // Test the query
    console.log('\n1️⃣ Testing content query...');
    const content = await prisma.content.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        image: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        privacyLevel: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            content_participants: true,
            comments: true,
            content_likes: true,
            content_shares: true,
            messages: true
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 20,
      skip: 0
    });

    console.log(`✅ Content query successful: Found ${content.length} records`);
    
    if (content.length > 0) {
      console.log('Sample content:', JSON.stringify(content[0], null, 2));
    }

    // Test the transformation
    console.log('\n2️⃣ Testing content transformation...');
    const transformedContent = content.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      image: item.image,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      startTime: item.startTime?.toISOString(),
      endTime: item.endTime?.toISOString(),
      privacyLevel: item.privacyLevel,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      creator: item.users,
      _count: {
        participants: item._count.content_participants,
        comments: item._count.comments,
        likes: item._count.content_likes,
        shares: item._count.content_shares,
        messages: item._count.messages
      }
    }));

    console.log(`✅ Content transformation successful: ${transformedContent.length} items`);
    
    if (transformedContent.length > 0) {
      console.log('Sample transformed content:', JSON.stringify(transformedContent[0], null, 2));
    }

    console.log('\n🎉 Feed API direct test completed successfully!');

  } catch (error) {
    console.error('❌ Error during feed API direct test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFeedAPIDirect();




