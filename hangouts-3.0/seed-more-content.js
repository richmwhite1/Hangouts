#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMoreContent() {
  console.log('🌱 Seeding more public content...');

  try {
    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (!testUser) {
      console.log('❌ Test user not found, creating one...');
      const newUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          clerkId: 'test_clerk_id_123',
          role: 'USER',
          isActive: true,
          isVerified: true,
        },
      });
      return await prisma.$disconnect();
    }

    // Create multiple public hangouts
    const hangouts = [
      {
        title: 'Weekend Hiking Adventure',
        description: 'Join us for a beautiful hike in the mountains this weekend!',
        location: 'Mountain Trail Park',
        city: 'San Francisco',
        state: 'CA',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        maxParticipants: 10,
      },
      {
        title: 'Tech Meetup & Networking',
        description: 'Connect with fellow developers over drinks and food',
        location: 'Tech Hub Downtown',
        city: 'San Francisco',
        state: 'CA',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        maxParticipants: 20,
      },
      {
        title: 'Beach Volleyball Day',
        description: 'Sun, sand, and volleyball! All skill levels welcome.',
        location: 'Ocean Beach',
        city: 'San Francisco',
        state: 'CA',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        maxParticipants: 12,
      },
    ];

    console.log('📝 Creating hangouts...');
    for (const hangoutData of hangouts) {
      const hangout = await prisma.content.create({
        data: {
          ...hangoutData,
          id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'HANGOUT',
          creatorId: testUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Created hangout: ${hangout.title}`);
    }

    // Create public events
    const events = [
      {
        title: 'Jazz Night at The Blue Note',
        description: 'Live jazz performance featuring local musicians',
        location: 'The Blue Note Jazz Club',
        city: 'San Francisco',
        state: 'CA',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        priceMin: 25,
        priceMax: 50,
        venue: 'The Blue Note',
      },
      {
        title: 'Art Gallery Opening',
        description: 'Contemporary art exhibition with wine and cheese',
        location: 'Modern Art Gallery',
        city: 'San Francisco',
        state: 'CA',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        priceMin: 0,
        priceMax: 0,
        venue: 'Modern Art Gallery',
      },
    ];

    console.log('📝 Creating events...');
    for (const eventData of events) {
      const event = await prisma.content.create({
        data: {
          ...eventData,
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'EVENT',
          creatorId: testUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Created event: ${event.title}`);
    }

    // Create a friend user
    const friendUser = await prisma.user.upsert({
      where: { email: 'friend@example.com' },
      update: {},
      create: {
        email: 'friend@example.com',
        username: 'friend',
        name: 'Friend User',
        clerkId: 'friend_clerk_id_456',
        role: 'USER',
        isActive: true,
        isVerified: true,
      },
    });
    console.log('✅ Created friend user:', friendUser.email);

    // Create a public hangout by the friend
    const friendHangout = await prisma.content.create({
      data: {
        id: `hangout_friend_${Date.now()}`,
        type: 'HANGOUT',
        title: 'Movie Night at My Place',
        description: 'Watching the latest blockbuster, popcorn included!',
        location: 'My House',
        city: 'Oakland',
        state: 'CA',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        maxParticipants: 8,
        creatorId: friendUser.id,
        updatedAt: new Date(),
      },
    });
    console.log('✅ Created friend hangout:', friendHangout.title);

    console.log('🎉 All content seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedMoreContent()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });

