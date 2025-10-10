#!/usr/bin/env node

/**
 * Create MVP Users Script
 * Creates users in both local and production databases for MVP testing
 */

const { PrismaClient } = require('@prisma/client');

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
    clerkId: 'user_alice',
    email: 'alice@example.com',
    username: 'alice',
    name: 'Alice Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_bob',
    email: 'bob@example.com',
    username: 'bob',
    name: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_charlie',
    email: 'charlie@example.com',
    username: 'charlie',
    name: 'Charlie Brown',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  }
];

async function createUsersInDatabase(prisma, dbName) {
  console.log(`\n🔧 Creating users in ${dbName} database...`);
  
  const createdUsers = [];
  
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
        console.log(`✅ User ${userData.email} already exists in ${dbName} (ID: ${existingUser.id})`);
        createdUsers.push(existingUser);
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

      console.log(`✅ Created user ${userData.email} in ${dbName} (ID: ${user.id})`);
      createdUsers.push(user);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email} in ${dbName}:`, error.message);
    }
  }

  return createdUsers;
}

async function createFriendships(prisma, dbName, users) {
  console.log(`\n🔗 Creating friendships in ${dbName} database...`);
  
  try {
    // Create friendships between all users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];
        
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
          console.log(`✅ Created friendship between ${user1.email} and ${user2.email} in ${dbName}`);
        } else {
          console.log(`✅ Friendship already exists between ${user1.email} and ${user2.email} in ${dbName}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error creating friendships in ${dbName}:`, error.message);
  }
}

async function createSampleHangouts(prisma, dbName, users) {
  console.log(`\n🎉 Creating sample hangouts in ${dbName} database...`);
  
  try {
    const creator = users[0]; // Use first user as creator
    
    // Create a few sample hangouts
    const hangouts = [
      {
        type: 'HANGOUT',
        title: 'Coffee & Code Session',
        description: 'Let\'s meet up for coffee and work on our projects together!',
        location: 'Downtown Coffee Shop',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        privacyLevel: 'PUBLIC',
        status: 'PUBLISHED',
        creatorId: creator.id
      },
      {
        type: 'HANGOUT',
        title: 'Weekend Hiking Adventure',
        description: 'Join us for a beautiful hike in the mountains!',
        location: 'Mountain Trail Park',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        privacyLevel: 'FRIENDS_ONLY',
        status: 'PUBLISHED',
        creatorId: creator.id
      },
      {
        type: 'HANGOUT',
        title: 'Game Night',
        description: 'Board games, video games, and snacks!',
        location: 'My Place',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
        privacyLevel: 'PUBLIC',
        status: 'PUBLISHED',
        creatorId: creator.id
      }
    ];

    for (const hangoutData of hangouts) {
      try {
        const hangout = await prisma.content.create({
          data: hangoutData
        });
        
        // Add all users as participants
        for (const user of users) {
          await prisma.participant.create({
            data: {
              contentId: hangout.id,
              userId: user.id,
              role: user.id === creator.id ? 'HOST' : 'MEMBER',
              rsvpStatus: 'PENDING',
              canEdit: user.id === creator.id,
              invitedAt: new Date()
            }
          });
        }
        
        console.log(`✅ Created hangout "${hangout.title}" in ${dbName}`);
      } catch (error) {
        console.error(`❌ Error creating hangout in ${dbName}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`❌ Error creating sample hangouts in ${dbName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting MVP user creation process...');
  
  try {
    // Create users in local database (if available)
    try {
      const localPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'file:./dev.db'
          }
        }
      });
      
      const localUsers = await createUsersInDatabase(localPrisma, 'local');
      await createFriendships(localPrisma, 'local', localUsers);
      await createSampleHangouts(localPrisma, 'local', localUsers);
      
      await localPrisma.$disconnect();
    } catch (error) {
      console.log('⚠️ Local database not available, skipping...');
    }
    
    // Create users in production database (if DATABASE_URL is set)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      const productionPrisma = new PrismaClient();
      
      const productionUsers = await createUsersInDatabase(productionPrisma, 'production');
      await createFriendships(productionPrisma, 'production', productionUsers);
      await createSampleHangouts(productionPrisma, 'production', productionUsers);
      
      await productionPrisma.$disconnect();
    } else {
      console.log('⚠️ No production DATABASE_URL found, skipping production database');
    }
    
    console.log('\n✅ MVP user creation process completed!');
    console.log('\n🎯 Next steps:');
    console.log('1. Test the app with the created users');
    console.log('2. Sign in with richmwhite@gmail.com or rwhite@victig.com');
    console.log('3. Test hangout creation, voting, and friend system');
    
  } catch (error) {
    console.error('❌ Error in MVP user creation process:', error);
  }
}

main();
