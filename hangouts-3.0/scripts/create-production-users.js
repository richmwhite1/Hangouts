#!/usr/bin/env node

/**
 * Create Production Users Script
 * This script creates users in both local and Railway databases
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Database connections
const localDb = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

const productionDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

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

async function createUsersInDatabase(db, dbName) {
  console.log(`\n🔧 Creating users in ${dbName} database...`);
  
  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { clerkId: userData.clerkId },
            { username: userData.username }
          ]
        }
      });

      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists in ${dbName}`);
        continue;
      }

      // Create user
      const user = await db.user.create({
        data: {
          ...userData,
          password: null, // Clerk users don't need passwords
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Created user ${userData.email} in ${dbName} (ID: ${user.id})`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email} in ${dbName}:`, error.message);
    }
  }
}

async function createFriendships(db, dbName) {
  console.log(`\n🔗 Creating friendships in ${dbName} database...`);
  
  try {
    // Get the two main users
    const user1 = await db.user.findFirst({ where: { email: 'richmwhite@gmail.com' } });
    const user2 = await db.user.findFirst({ where: { email: 'rwhite@victig.com' } });
    
    if (!user1 || !user2) {
      console.log(`⚠️ Could not find users for friendship creation in ${dbName}`);
      return;
    }

    // Check if friendship already exists
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId1: user1.id, userId2: user2.id },
          { userId1: user2.id, userId2: user1.id }
        ]
      }
    });

    if (existingFriendship) {
      console.log(`✅ Friendship already exists between ${user1.email} and ${user2.email} in ${dbName}`);
      return;
    }

    // Create friendship
    await db.friendship.create({
      data: {
        userId1: user1.id,
        userId2: user2.id,
        status: 'ACCEPTED',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Created friendship between ${user1.email} and ${user2.email} in ${dbName}`);
  } catch (error) {
    console.error(`❌ Error creating friendships in ${dbName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting user creation process...');
  
  try {
    // Create users in local database
    await createUsersInDatabase(localDb, 'local');
    await createFriendships(localDb, 'local');
    
    // Create users in production database (if DATABASE_URL is set)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      await createUsersInDatabase(productionDb, 'production');
      await createFriendships(productionDb, 'production');
    } else {
      console.log('⚠️ No production DATABASE_URL found, skipping production database');
    }
    
    console.log('\n✅ User creation process completed!');
    
  } catch (error) {
    console.error('❌ Error in user creation process:', error);
  } finally {
    await localDb.$disconnect();
    await productionDb.$disconnect();
  }
}

main();
