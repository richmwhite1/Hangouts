#!/usr/bin/env node

/**
 * Create Production Users Script for Railway PostgreSQL
 * This script creates users in the Railway production database
 */

const { PrismaClient } = require('@prisma/client');

// Use production schema for PostgreSQL
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
    clerkId: 'user_alex_johnson',
    email: 'alex.johnson@example.com',
    username: 'alexjohnson',
    name: 'Alex Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_sarah_chen',
    email: 'sarah.chen@example.com',
    username: 'sarahchen',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_mike_rodriguez',
    email: 'mike.rodriguez@example.com',
    username: 'mikerodriguez',
    name: 'Mike Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_emma_wilson',
    email: 'emma.wilson@example.com',
    username: 'emmawilson',
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_david_kim',
    email: 'david.kim@example.com',
    username: 'davidkim',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_lisa_garcia',
    email: 'lisa.garcia@example.com',
    username: 'lisagarcia',
    name: 'Lisa Garcia',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_james_brown',
    email: 'james.brown@example.com',
    username: 'jamesbrown',
    name: 'James Brown',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_olivia_taylor',
    email: 'olivia.taylor@example.com',
    username: 'oliviataylor',
    name: 'Olivia Taylor',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  }
];

async function createUsersInProduction() {
  console.log('🔧 Creating users in production database...');
  
  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await productionDb.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { clerkId: userData.clerkId },
            { username: userData.username }
          ]
        }
      });

      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists in production`);
        continue;
      }

      // Create user
      const user = await productionDb.user.create({
        data: {
          ...userData,
          password: null, // Clerk users don't need passwords
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Created user ${userData.email} in production (ID: ${user.id})`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email} in production:`, error.message);
    }
  }
}

async function createFriendshipsInProduction() {
  console.log('\n🔗 Creating friendships in production database...');
  
  try {
    // Get all users
    const allUsers = await productionDb.user.findMany({
      where: {
        email: {
          in: users.map(u => u.email)
        }
      }
    });

    if (allUsers.length < 2) {
      console.log('⚠️ Need at least 2 users for friendship creation in production');
      return;
    }

    console.log(`Found ${allUsers.length} users in production`);

    // Create friendships between all users (everyone is friends with everyone)
    let friendshipCount = 0;
    for (let i = 0; i < allUsers.length; i++) {
      for (let j = i + 1; j < allUsers.length; j++) {
        const user1 = allUsers[i];
        const user2 = allUsers[j];

        // Check if friendship already exists
        const existingFriendship = await productionDb.friendship.findFirst({
          where: {
            OR: [
              { userId: user1.id, friendId: user2.id },
              { userId: user2.id, friendId: user1.id }
            ]
          }
        });

        if (!existingFriendship) {
          // Create friendship (bidirectional)
          await productionDb.friendship.createMany({
            data: [
              {
                userId: user1.id,
                friendId: user2.id,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
              },
              {
                userId: user2.id,
                friendId: user1.id,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          });

          friendshipCount++;
          console.log(`✅ Created friendship between ${user1.name} and ${user2.name} in production`);
        } else {
          console.log(`✅ Friendship already exists between ${user1.name} and ${user2.name} in production`);
        }
      }
    }

    console.log(`✅ Created ${friendshipCount} new friendships in production`);
  } catch (error) {
    console.error('❌ Error creating friendships in production:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting production user creation process...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  try {
    await createUsersInProduction();
    await createFriendshipsInProduction();
    
    console.log('\n✅ Production user creation process completed!');
    
  } catch (error) {
    console.error('❌ Error in production user creation process:', error);
  } finally {
    await productionDb.$disconnect();
  }
}

main();
