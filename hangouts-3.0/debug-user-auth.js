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

async function debugUserAuth() {
  console.log('🔍 Debugging user authentication in Railway database...');

  try {
    // Test database connection
    console.log('\n1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Check all users in the database
    console.log('\n2. All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`   User ${index + 1}:`, {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      });
    });

    // Check for Richard specifically
    console.log('\n3. Looking for Richard...');
    const richardUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: 'richard', mode: 'insensitive' } },
          { name: { contains: 'richard', mode: 'insensitive' } },
          { email: { contains: 'richard', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    });

    if (richardUsers.length > 0) {
      console.log('✅ Richard users found:');
      richardUsers.forEach((user, index) => {
        console.log(`   Richard ${index + 1}:`, user);
      });
    } else {
      console.log('❌ No Richard users found');
    }

    // Check for users with email richard@example.com
    console.log('\n4. Looking for richard@example.com...');
    const richardEmail = await prisma.user.findUnique({
      where: { email: 'richard@example.com' },
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    });

    if (richardEmail) {
      console.log('✅ Richard email user found:', richardEmail);
    } else {
      console.log('❌ Richard email user not found');
    }

  } catch (error) {
    console.error('❌ Error during user auth debug:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

debugUserAuth();














