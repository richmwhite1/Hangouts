const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function debugFeedAPI() {
  try {
    console.log('🐛 Debugging feed API...\n');

    // Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found.');
      return;
    }

    console.log(`✅ Found user: ${user.username} (${user.id})`);

    // Create a JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log(`✅ Generated token: ${token.substring(0, 50)}...`);

    // Test the exact feed API logic
    console.log('\n1️⃣ Testing feed API logic...');
    
    const userId = user.id;
    let friendIds = [];
    
    // Get user's friends
    console.log('Getting user friends...');
    const userFriends = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: userId },
          { friendId: userId }
        ]
      },
      select: {
        userId: true,
        friendId: true
      }
    });

    friendIds = userFriends.map(friend => 
      friend.userId === userId ? friend.friendId : friend.userId
    );
    
    console.log(`✅ Found ${friendIds.length} friends`);

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
    console.log('\n2️⃣ Testing content query...');
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
    console.log('\n3️⃣ Testing content transformation...');
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

    console.log('\n🎉 Feed API debug completed successfully!');

  } catch (error) {
    console.error('❌ Error during feed API debug:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugFeedAPI();












