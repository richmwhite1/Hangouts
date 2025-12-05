#!/usr/bin/env node

/**
 * Verify Users and Friendships
 * 
 * This script checks if the required users exist and analyzes the current
 * friendship system state in both local and production databases.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Try to connect to the local SQLite database first
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function checkLocalDatabase() {
  console.log('🔍 Checking local SQLite database...');
  
  try {
    // Check if users exist
    const users = await localPrisma.user.findMany({
      where: {
        OR: [
          { username: 'richmwhite' },
          { username: 'rwhite' }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        isActive: true,
        clerkId: true
      }
    });
    
    console.log('👥 Found users in local database:');
    console.table(users);
    
    if (users.length === 0) {
      console.log('❌ No target users found in local database');
      return { hasUsers: false, users: [] };
    }
    
    // Check friendships using current schema
    try {
      const friendships = await localPrisma.friendship.findMany({
        where: {
          OR: [
            { userId: { in: users.map(u => u.id) } },
            { friendId: { in: users.map(u => u.id) } }
          ]
        },
        include: {
          user: { select: { username: true, name: true } },
          friend: { select: { username: true, name: true } }
        }
      });
      
      console.log('🤝 Found friendships in local database:');
      console.table(friendships.map(f => ({
        id: f.id,
        user: f.user.username,
        friend: f.friend.username,
        status: f.status
      })));
      
    } catch (error) {
      console.log('⚠️  Error querying friendships with userId/friendId schema:', error.message);
      
      // Try alternative schema (user1Id/user2Id)
      try {
        const friendships = await localPrisma.$queryRaw`
          SELECT f.id, u1.username as user1, u2.username as user2, f.createdAt
          FROM friendships f
          JOIN users u1 ON f.user1Id = u1.id
          JOIN users u2 ON f.user2Id = u2.id
          WHERE f.user1Id IN (${users.map(u => `'${u.id}'`).join(',')}) 
             OR f.user2Id IN (${users.map(u => `'${u.id}'`).join(',')})
        `;
        
        console.log('🤝 Found friendships using user1Id/user2Id schema:');
        console.table(friendships);
        
      } catch (altError) {
        console.log('❌ Could not query friendships with either schema');
      }
    }
    
    // Check friend requests
    try {
      const requests = await localPrisma.friendRequest.findMany({
        where: {
          OR: [
            { senderId: { in: users.map(u => u.id) } },
            { receiverId: { in: users.map(u => u.id) } }
          ]
        },
        include: {
          sender: { select: { username: true, name: true } },
          receiver: { select: { username: true, name: true } }
        }
      });
      
      console.log('📨 Found friend requests:');
      console.table(requests.map(r => ({
        id: r.id,
        from: r.sender.username,
        to: r.receiver.username,
        status: r.status
      })));
      
    } catch (error) {
      console.log('❌ Error querying friend requests:', error.message);
    }
    
    return { hasUsers: true, users };
    
  } catch (error) {
    console.log('❌ Error connecting to local database:', error.message);
    return { hasUsers: false, users: [] };
  }
}

async function createMissingUsers() {
  console.log('👤 Creating missing users...');
  
  const usersToCreate = [
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
    }
  ];
  
  const createdUsers = [];
  
  for (const userData of usersToCreate) {
    try {
      // Check if user already exists
      const existing = await localPrisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { username: userData.username }
          ]
        }
      });
      
      if (existing) {
        console.log(`✅ User ${userData.username} already exists`);
        createdUsers.push(existing);
      } else {
        const user = await localPrisma.user.create({
          data: userData
        });
        console.log(`✅ Created user: ${user.username} (${user.name})`);
        createdUsers.push(user);
      }
    } catch (error) {
      console.log(`❌ Error creating user ${userData.username}:`, error.message);
    }
  }
  
  return createdUsers;
}

async function createTestFriendship(users) {
  if (users.length < 2) {
    console.log('❌ Need at least 2 users to create friendship');
    return;
  }
  
  const [user1, user2] = users;
  
  try {
    // Check if friendship already exists
    const existing = await localPrisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user1.id, friendId: user2.id },
          { userId: user2.id, friendId: user1.id }
        ]
      }
    });
    
    if (existing) {
      console.log('✅ Friendship already exists between users');
      return;
    }
    
    // Create bidirectional friendship
    const friendship1 = await localPrisma.friendship.create({
      data: {
        userId: user1.id,
        friendId: user2.id,
        status: 'ACTIVE'
      }
    });
    
    const friendship2 = await localPrisma.friendship.create({
      data: {
        userId: user2.id,
        friendId: user1.id,
        status: 'ACTIVE'
      }
    });
    
    console.log('✅ Created bidirectional friendship');
    console.log(`   ${user1.username} -> ${user2.username}: ${friendship1.id}`);
    console.log(`   ${user2.username} -> ${user1.username}: ${friendship2.id}`);
    
  } catch (error) {
    console.log('❌ Error creating friendship:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const createUsers = args.includes('--create-users');
  const createFriendships = args.includes('--create-friendships');
  
  console.log('🔧 User and Friendship Verification Tool');
  console.log('==========================================');
  
  try {
    const result = await checkLocalDatabase();
    
    if (!result.hasUsers && createUsers) {
      const users = await createMissingUsers();
      
      if (createFriendships && users.length >= 2) {
        await createTestFriendship(users);
      }
    } else if (result.hasUsers && createFriendships) {
      await createTestFriendship(result.users);
    }
    
    // Re-check after potential changes
    if (createUsers || createFriendships) {
      console.log('\n🔄 Re-checking after changes...');
      await checkLocalDatabase();
    }
    
    console.log('\n✅ Verification completed!');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await localPrisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkLocalDatabase, createMissingUsers, createTestFriendship };






