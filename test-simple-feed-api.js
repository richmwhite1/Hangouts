const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSimpleFeedAPI() {
  try {
    console.log('🧪 Testing simple feed API...\n');

    // Test 1: Simple content query
    console.log('1️⃣ Testing simple content query...');
    const content = await prisma.content.findMany({
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

    // Test 2: Transform content
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

    // Test 3: Create response
    console.log('\n3️⃣ Testing response creation...');
    const response = {
      success: true,
      data: {
        content: transformedContent,
        pagination: {
          limit: 20,
          offset: 0,
          total: transformedContent.length,
          hasMore: transformedContent.length === 20
        }
      }
    };

    console.log(`✅ Response creation successful: ${response.data.content.length} items`);

    console.log('\n🎉 Simple feed API test completed successfully!');

  } catch (error) {
    console.error('❌ Error during simple feed API test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleFeedAPI();