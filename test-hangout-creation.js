const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHangoutCreation() {
  try {
    console.log('🧪 Testing hangout creation with unified schema...\n');

    // Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    console.log(`Using user: ${user.username} (${user.id})`);

    // Test creating a hangout using the new unified schema
    const hangout = await prisma.content.create({
      data: {
        id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'HANGOUT',
        title: 'Test Hangout Creation',
        description: 'Testing hangout creation with unified schema',
        image: 'https://example.com/test-hangout.jpg',
        location: 'Test Location',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date(),
        // Hangout-specific fields
        maxParticipants: 10,
        weatherEnabled: true,
        content_participants: {
          create: {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: user.id,
            role: 'CREATOR',
            canEdit: true,
            joinedAt: new Date(),
          }
        }
      }
    });

    console.log('✅ Hangout created successfully!');
    console.log(`   ID: ${hangout.id}`);
    console.log(`   Title: ${hangout.title}`);
    console.log(`   Type: ${hangout.type}`);
    console.log(`   Max Participants: ${hangout.maxParticipants}`);
    console.log(`   Weather Enabled: ${hangout.weatherEnabled}`);

    // Verify the hangout was created with all fields
    const createdHangout = await prisma.content.findUnique({
      where: { id: hangout.id },
      include: {
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log('\n📊 Hangout details:');
    console.log(`   Participants: ${createdHangout?.content_participants.length || 0}`);
    if (createdHangout?.content_participants.length > 0) {
      console.log(`   Creator: ${createdHangout.content_participants[0].users.username}`);
    }

    console.log('\n🎉 Hangout creation test passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testHangoutCreation().catch(console.error);




