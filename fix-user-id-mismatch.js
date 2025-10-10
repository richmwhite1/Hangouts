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

async function fixUserIdMismatch() {
  console.log('🔧 Fixing user ID mismatch in Railway database...');

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
      
      // Update the user ID to match what the authentication API returns
      const authUserId = 'cmgblx1m60000jpmxa83aqu3g';
      
      if (existingUser.id !== authUserId) {
        console.log('🔄 Updating user ID from', existingUser.id, 'to', authUserId);
        
        // First, update any foreign key references
        await prisma.content.updateMany({
          where: { creatorId: existingUser.id },
          data: { creatorId: authUserId }
        });
        
        await prisma.polls.updateMany({
          where: { creatorId: existingUser.id },
          data: { creatorId: authUserId }
        });
        
        // Update the user ID
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { id: authUserId }
        });
        
        console.log('✅ User ID updated successfully');
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
      title: 'User ID Fix Test Hangout',
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
      title: 'User ID Fix Test Poll',
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

    console.log('\n🎉 User ID mismatch fix completed!');

  } catch (error) {
    console.error('❌ Error fixing user ID mismatch:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

fixUserIdMismatch();