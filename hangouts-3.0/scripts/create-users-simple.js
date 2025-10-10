#!/usr/bin/env node

/**
 * Simple User Creation Script
 * Creates users directly in the database using Prisma
 */

const { PrismaClient } = require('@prisma/client');

async function createUsers() {
  console.log('🚀 Creating users in database...');
  
  const prisma = new PrismaClient();
  
  const users = [
    {
      clerkId: 'user_richmwhite',
      email: 'richmwhite@gmail.com',
      username: 'richmwhite',
      name: 'Rich White',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isActive: true,
      isVerified: true,
      role: 'USER'
    },
    {
      clerkId: 'user_rwhite',
      email: 'rwhite@victig.com',
      username: 'rwhite',
      name: 'Richard White',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isActive: true,
      isVerified: true,
      role: 'USER'
    },
    {
      clerkId: 'user_test1',
      email: 'test1@example.com',
      username: 'testuser1',
      name: 'Test User 1',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isActive: true,
      isVerified: true,
      role: 'USER'
    },
    {
      clerkId: 'user_test2',
      email: 'test2@example.com',
      username: 'testuser2',
      name: 'Test User 2',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      isActive: true,
      isVerified: true,
      role: 'USER'
    }
  ];

  try {
    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: userData.email },
              { clerkId: userData.clerkId },
              { username: userData.username }
            ]
          }
        });

        if (existingUser) {
          console.log(`✅ User ${userData.email} already exists (ID: ${existingUser.id})`);
          continue;
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            ...userData,
            lastSeen: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log(`✅ Created user ${userData.email} (ID: ${user.id})`);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Create friendships between the main users
    console.log('\n🔗 Creating friendships...');
    
    const user1 = await prisma.user.findFirst({ where: { email: 'richmwhite@gmail.com' } });
    const user2 = await prisma.user.findFirst({ where: { email: 'rwhite@victig.com' } });
    
    if (user1 && user2) {
      // Check if friendship already exists
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId1: user1.id, userId2: user2.id },
            { userId1: user2.id, userId2: user1.id }
          ]
        }
      });

      if (!existingFriendship) {
        await prisma.friendship.create({
          data: {
            userId1: user1.id,
            userId2: user2.id,
            status: 'ACCEPTED',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`✅ Created friendship between ${user1.email} and ${user2.email}`);
      } else {
        console.log(`✅ Friendship already exists between ${user1.email} and ${user2.email}`);
      }
    }

    console.log('\n✅ User creation completed!');
    
  } catch (error) {
    console.error('❌ Error in user creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
