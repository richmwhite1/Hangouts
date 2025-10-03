const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testContentQuery() {
  try {
    console.log('🧪 Testing content query...\n');

    // Test 1: Simple content query
    console.log('1️⃣ Testing simple content query...');
    try {
      const contents = await prisma.content.findMany({
        where: { status: 'PUBLISHED' },
        take: 5
      });
      console.log(`✅ Simple content query: Found ${contents.length} records`);
    } catch (error) {
      console.log('❌ Simple content query error:', error.message);
    }

    // Test 2: Content query with users relationship
    console.log('\n2️⃣ Testing content query with users relationship...');
    try {
      const contents = await prisma.content.findMany({
        where: { status: 'PUBLISHED' },
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
          }
        },
        take: 5
      });
      console.log(`✅ Content with users query: Found ${contents.length} records`);
      
      if (contents.length > 0) {
        console.log('Sample content:', JSON.stringify(contents[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Content with users query error:', error.message);
    }

    // Test 3: Content query with content_participants
    console.log('\n3️⃣ Testing content query with participants...');
    try {
      const contents = await prisma.content.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          type: true,
          title: true,
          content_participants: {
            select: {
              id: true,
              userId: true,
              role: true,
              users: {
                select: {
                  id: true,
                  username: true,
                  name: true
                }
              }
            }
          }
        },
        take: 5
      });
      console.log(`✅ Content with participants query: Found ${contents.length} records`);
      
      if (contents.length > 0) {
        console.log('Sample content with participants:', JSON.stringify(contents[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Content with participants query error:', error.message);
    }

    // Test 4: Test the exact query from feed API
    console.log('\n4️⃣ Testing exact feed API query...');
    try {
      const whereClause = {
        status: 'PUBLISHED',
        OR: [
          { privacyLevel: 'PUBLIC' }
        ]
      };

      const contents = await prisma.content.findMany({
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
      
      console.log(`✅ Feed API query: Found ${contents.length} records`);
      
      if (contents.length > 0) {
        console.log('Sample feed content:', JSON.stringify(contents[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Feed API query error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error during content query test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testContentQuery();







