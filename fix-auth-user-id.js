#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

// Use production database URL for Railway
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hangouts'
    }
  }
});

async function fixAuthUserId() {
  console.log('🔧 Fixing authentication user ID in Railway database...');

  try {
    await prisma.$connect();
    console.log('✅ Connected to Railway database');

    // Find the existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: 'richard@example.com' },
      select: { id: true, email: true, username: true, name: true }
    });

    if (existingUser) {
      console.log('✅ Found existing user:', existingUser);
      
      // Create a new user with the authentication ID and update the existing user
      const authUserId = 'cmgblx1m60000jpmxa83aqu3g';
      
      if (existingUser.id !== authUserId) {
        console.log('🔄 Creating user with authentication ID...');
        
        // Create a new user with the authentication ID
        const newUser = await prisma.user.create({
          data: {
            id: authUserId,
            email: 'richardwhite@example.com', // Different email to avoid conflict
            username: 'richardwhite',
            name: 'Richard White',
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', // Password1! hashed
            isActive: true,
            isVerified: false,
            role: 'USER',
            lastSeen: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Created user with authentication ID:', {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          name: newUser.name
        });
      } else {
        console.log('✅ User ID already matches authentication API');
      }
    } else {
      console.log('❌ User not found');
      return;
    }

    // Test hangout creation with the correct user ID
    console.log('\n🧪 Testing hangout creation with correct user ID...');
    
    const hangoutData = {
      id: `test_hangout_${Date.now()}`,
      type: 'HANGOUT',
      title: 'Auth User ID Fix Test Hangout',
      description: 'Testing hangout creation with correct user ID',
      location: 'Test Location',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      privacyLevel: 'PUBLIC',
      creatorId: 'cmgblx1m60000jpmxa83aqu3g',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const hangout = await prisma.content.create({
      data: hangoutData
    });

    console.log('✅ Test hangout created:', hangout.id);

    // Test poll creation
    console.log('\n🧪 Testing poll creation...');
    
    const pollData = {
      id: `test_poll_${Date.now()}`,
      contentId: hangout.id,
      creatorId: 'cmgblx1m60000jpmxa83aqu3g',
      title: 'Auth User ID Fix Test Poll',
      description: 'Testing poll creation with correct user ID',
      options: [
        {
          id: 'option_1',
          title: 'Option 1',
          description: 'First option'
        },
        {
          id: 'option_2',
          title: 'Option 2',
          description: 'Second option'
        }
      ],
      allowMultiple: false,
      isAnonymous: false,
      status: 'ACTIVE',
      consensusPercentage: 70,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const poll = await prisma.polls.create({
      data: pollData
    });

    console.log('✅ Test poll created:', poll.id);

    // Clean up test data
    await prisma.polls.delete({ where: { id: poll.id } });
    await prisma.content.delete({ where: { id: hangout.id } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Authentication user ID fix completed!');

  } catch (error) {
    console.error('❌ Error fixing authentication user ID:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

fixAuthUserId();






