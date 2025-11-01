#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { createClerkClient } = require('@clerk/backend');

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function syncAllClerkUsers() {
  try {
    console.log('\n🔄 Syncing ALL Clerk users to database...\n');
    
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY not found in environment');
    }
    
    // Get all users from Clerk
    const clerkUsers = await clerk.users.getUserList({ limit: 500 });
    console.log(`📊 Found ${clerkUsers.totalCount} users in Clerk\n`);
    
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const clerkUser of clerkUsers.data) {
      try {
        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        const firstName = clerkUser.firstName || '';
        const lastName = clerkUser.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'User';
        const username = clerkUser.username || email?.split('@')[0] || `user_${clerkUser.id.substring(0, 8)}`;
        
        console.log(`Processing: ${fullName} (${email})`);
        
        if (!email) {
          console.log(`  ⚠️  Skipping - no email`);
          continue;
        }
        
        // Check if user exists in database by clerkId
        let dbUser = await prisma.user.findUnique({
          where: { clerkId: clerkUser.id }
        });
        
        // If not found by clerkId, check by email
        if (!dbUser) {
          dbUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          });
        }
        
        if (dbUser) {
          // Update existing user
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              clerkId: clerkUser.id,
              name: fullName,
              avatar: clerkUser.imageUrl,
              isVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified' || false,
              isActive: true
            }
          });
          console.log(`  ✅ Updated (DB ID: ${dbUser.id})`);
          updatedCount++;
        } else {
          // Create new user - ensure unique username
          let uniqueUsername = username;
          let counter = 1;
          while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${username}${counter}`;
            counter++;
          }
          
          dbUser = await prisma.user.create({
            data: {
              clerkId: clerkUser.id,
              email: email.toLowerCase(),
              username: uniqueUsername,
              name: fullName,
              avatar: clerkUser.imageUrl,
              isVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified' || false,
              isActive: true,
              role: 'USER',
              password: null // Clerk users don't need passwords
            }
          });
          console.log(`  ✨ Created (DB ID: ${dbUser.id}, Username: ${uniqueUsername})`);
          createdCount++;
        }
        
        syncedCount++;
      } catch (error) {
        console.error(`  ❌ Error processing user ${clerkUser.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`  Total processed: ${syncedCount}`);
    console.log(`  Created: ${createdCount}`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`\n✅ Sync complete!\n`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncAllClerkUsers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

