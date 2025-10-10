#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedLocalData() {
  console.log('🌱 Seeding local development data...');

  try {
    // Create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        clerkId: 'test_clerk_id_123',
        role: 'USER',
        isActive: true,
        isVerified: true,
      },
    });

    console.log('✅ Created test user:', testUser.email);

    // Create a sample hangout
    const sampleHangout = await prisma.content.create({
      data: {
        id: 'hangout_001',
        type: 'HANGOUT',
        title: 'Coffee Meetup',
        description: 'Let\'s grab coffee and catch up!',
        creatorId: testUser.id,
        status: 'PUBLISHED',
        privacyLevel: 'FRIENDS_ONLY',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Downtown Coffee Shop',
        city: 'San Francisco',
        state: 'CA',
        maxParticipants: 6,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Created sample hangout:', sampleHangout.title);

    // Create a sample poll for the hangout
    const samplePoll = await prisma.polls.create({
      data: {
        id: 'poll_001',
        contentId: sampleHangout.id,
        creatorId: testUser.id,
        title: 'What time works best?',
        description: 'Choose your preferred time for the coffee meetup',
        options: JSON.stringify([
          { id: 'morning', text: 'Morning (9-11 AM)', description: 'Early coffee' },
          { id: 'afternoon', text: 'Afternoon (2-4 PM)', description: 'Afternoon coffee' },
          { id: 'evening', text: 'Evening (6-8 PM)', description: 'Evening coffee' }
        ]),
        allowMultiple: false,
        isAnonymous: false,
        consensusPercentage: 60,
        minimumParticipants: 2,
        status: 'ACTIVE',
        visibility: 'PRIVATE',
      },
    });

    console.log('✅ Created sample poll:', samplePoll.title);

    // Create a sample conversation
    const sampleConversation = await prisma.conversation.create({
      data: {
        id: 'conv_001',
        type: 'GROUP',
        name: 'Coffee Meetup Chat',
        description: 'Chat for our coffee meetup',
        createdById: testUser.id,
        isActive: true,
      },
    });

    console.log('✅ Created sample conversation:', sampleConversation.name);

    // Add user as participant to conversation
    await prisma.conversationParticipant.create({
      data: {
        conversationId: sampleConversation.id,
        userId: testUser.id,
        role: 'ADMIN',
        joinedAt: new Date(),
      },
    });

    console.log('✅ Added user to conversation');

    console.log('🎉 Local development data seeded successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log(`- User: ${testUser.email} (${testUser.username})`);
    console.log(`- Hangout: ${sampleHangout.title}`);
    console.log(`- Poll: ${samplePoll.title}`);
    console.log(`- Conversation: ${sampleConversation.name}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedLocalData()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
