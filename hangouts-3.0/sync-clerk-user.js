#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncClerkUser() {
  console.log('🔄 Syncing Clerk user to database...');

  try {
    // Clerk ID from the terminal output
    const clerkId = 'user_33r1u7EtQAJ6do5Ghc0pnTwd94B';
    
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: 'richard@example.com'
      }
    });

    if (existingUser) {
      // Update with clerkId
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { clerkId: clerkId }
      });
      console.log('✅ Updated user with Clerk ID:', updatedUser.email);
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkId,
          email: 'richard@example.com',
          username: 'richard',
          name: 'Richard White',
          role: 'USER',
          isActive: true,
          isVerified: true,
        }
      });
      console.log('✅ Created new user:', newUser.email);
    }

    // Now associate some content with this user
    const userId = 'user_0';
    
    // Create some public content for this user
    const userContent = await prisma.content.findFirst({
      where: { creatorId: userId }
    });

    if (!userContent) {
      console.log('📝 Creating content for Clerk user...');
      
      const hangout = await prisma.content.create({
        data: {
          id: `hangout_clerk_${Date.now()}`,
          type: 'HANGOUT',
          title: 'My First Hangout',
          description: 'This is a hangout created by the Clerk user',
          creatorId: userId,
          status: 'PUBLISHED',
          privacyLevel: 'PUBLIC',
          startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          location: 'San Francisco',
          city: 'San Francisco',
          state: 'CA',
          maxParticipants: 10,
          updatedAt: new Date(),
        }
      });
      console.log('✅ Created hangout:', hangout.title);
    } else {
      console.log('✅ User already has content');
    }

    console.log('🎉 Clerk user sync completed!');

  } catch (error) {
    console.error('❌ Error syncing user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncClerkUser()
  .then(() => {
    console.log('✅ Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });

