#!/usr/bin/env node

/**
 * Create Users in Railway Database
 * Uses the production API to create users
 */

const users = [
  {
    clerkId: 'user_richmwhite',
    email: 'richmwhite@gmail.com',
    username: 'richmwhite',
    name: 'Rich White',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_rwhite',
    email: 'rwhite@victig.com',
    username: 'rwhite',
    name: 'Richard White',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_test1',
    email: 'test1@example.com',
    username: 'testuser1',
    name: 'Test User 1',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_test2',
    email: 'test2@example.com',
    username: 'testuser2',
    name: 'Test User 2',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
  }
];

async function createUser(userData) {
  try {
    const response = await fetch('https://hangouts-3-0-production.up.railway.app/api/auth/sync-clerk-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Created user ${userData.email}:`, result.data?.user?.id || 'Unknown ID');
      return result.data?.user;
    } else {
      const error = await response.text();
      console.log(`⚠️ User ${userData.email} might already exist or error:`, response.status, error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating user ${userData.email}:`, error.message);
    return null;
  }
}

async function createFriendship(user1Id, user2Id) {
  try {
    const response = await fetch('https://hangouts-3-0-production.up.railway.app/api/friends/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user2Id })
    });

    if (response.ok) {
      console.log(`✅ Sent friend request from ${user1Id} to ${user2Id}`);
      return true;
    } else {
      console.log(`⚠️ Friend request might already exist:`, response.status);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating friendship:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating users in Railway database...\n');
  
  const createdUsers = [];
  
  // Create users
  for (const userData of users) {
    const user = await createUser(userData);
    if (user) {
      createdUsers.push(user);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Created ${createdUsers.length} users`);
  
  // Create friendships between the main users
  if (createdUsers.length >= 2) {
    console.log('\n🔗 Creating friendships...');
    
    const user1 = createdUsers.find(u => u.email === 'richmwhite@gmail.com');
    const user2 = createdUsers.find(u => u.email === 'rwhite@victig.com');
    
    if (user1 && user2) {
      await createFriendship(user1.id, user2.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await createFriendship(user2.id, user1.id);
    }
  }
  
  console.log('\n✅ User creation process completed!');
  console.log('\n🎯 Next steps:');
  console.log('1. Sign in with richmwhite@gmail.com and rwhite@victig.com');
  console.log('2. Check if you can see each other in friends');
  console.log('3. Test hangout creation and invitation');
}

main().catch(console.error);
