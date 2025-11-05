const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function testClerkSync() {
  try {
    console.log('🔍 Testing Clerk user synchronization...\n');
    
    // Check if clerkId field exists
    console.log('1. Checking database schema...');
    const users = await db.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`   Total users in database: ${users.length}\n`);
    
    // Check users with Clerk IDs
    const usersWithClerkId = users.filter(u => u.clerkId);
    const usersWithoutClerkId = users.filter(u => !u.clerkId);
    
    console.log(`2. Users with Clerk ID: ${usersWithClerkId.length}`);
    usersWithClerkId.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (@${user.username})`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Clerk ID: ${user.clerkId}`);
      console.log(`      Active: ${user.isActive}`);
      console.log('');
    });
    
    console.log(`3. Users WITHOUT Clerk ID: ${usersWithoutClerkId.length}`);
    if (usersWithoutClerkId.length > 0) {
      console.log('   ⚠️  These users need to be synced with Clerk:');
      usersWithoutClerkId.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (@${user.username}) - ${user.email}`);
      });
      console.log('\n   💡 Tip: Users without Clerk ID will be synced when they sign in.');
      console.log('   💡 Or use the sync-all-clerk-users.js script to sync them manually.');
    }
    
    // Check for duplicate emails
    console.log('\n4. Checking for duplicate emails...');
    const emailCounts = {};
    users.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
    });
    const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('   ⚠️  Found duplicate emails:');
      duplicates.forEach(([email, count]) => {
        console.log(`   - ${email} (${count} times)`);
      });
    } else {
      console.log('   ✅ No duplicate emails found');
    }
    
    // Check environment variables
    console.log('\n5. Checking Clerk environment variables...');
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    const clerkWebhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    console.log(`   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${clerkPublishableKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   CLERK_SECRET_KEY: ${clerkSecretKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   CLERK_WEBHOOK_SECRET: ${clerkWebhookSecret ? '✅ Set' : '⚠️  Missing (optional for webhooks)'}`);
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Users with Clerk ID: ${usersWithClerkId.length}`);
    console.log(`   Users without Clerk ID: ${usersWithoutClerkId.length}`);
    console.log(`   Active users: ${users.filter(u => u.isActive).length}`);
    
    if (usersWithClerkId.length === 0 && users.length > 0) {
      console.log('\n⚠️  WARNING: No users have Clerk IDs!');
      console.log('   This means users cannot sign in with Clerk.');
      console.log('   Solutions:');
      console.log('   1. Run: node sync-all-clerk-users.js');
      console.log('   2. Or have users sign up/in through Clerk (they will be auto-synced)');
    } else if (usersWithClerkId.length > 0) {
      console.log('\n✅ Clerk integration is working!');
      console.log(`   ${usersWithClerkId.length} user(s) can sign in with Clerk.`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Clerk sync:', error);
    console.error('   Details:', error.message);
    
    if (error.message.includes('clerkId')) {
      console.error('\n⚠️  The clerkId field may not exist in your database schema.');
      console.error('   Run: npx prisma migrate dev');
      console.error('   Or: npx prisma db push');
    }
  } finally {
    await db.$disconnect();
  }
}

testClerkSync();

