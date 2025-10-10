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

async function debugHangoutCreation() {
  console.log('🔍 Debugging hangout creation in Railway database...');

  try {
    // Test database connection
    console.log('\n1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Check recent hangouts
    console.log('\n2. Recent hangouts in database:');
    const recentHangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      select: {
        id: true,
        title: true,
        creatorId: true,
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`Found ${recentHangouts.length} recent hangouts:`);
    recentHangouts.forEach((hangout, index) => {
      console.log(`   Hangout ${index + 1}:`, {
        id: hangout.id,
        title: hangout.title,
        creatorId: hangout.creatorId,
        status: hangout.status,
        createdAt: hangout.createdAt
      });
    });

    // Check if the specific hangout from our test exists
    console.log('\n3. Checking for specific test hangout...');
    const testHangoutId = 'hangout_1759892920313_6k0hcvwda'; // From our last test
    const testHangout = await prisma.content.findUnique({
      where: { id: testHangoutId },
      include: {
        polls: true
      }
    });

    if (testHangout) {
      console.log('✅ Test hangout found:', {
        id: testHangout.id,
        title: testHangout.title,
        status: testHangout.status,
        pollsCount: testHangout.polls.length
      });
    } else {
      console.log('❌ Test hangout not found in database');
    }

    // Check for any hangouts created today
    console.log('\n4. Checking for hangouts created today...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayHangouts = await prisma.content.findMany({
      where: { 
        type: 'HANGOUT',
        createdAt: {
          gte: today
        }
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${todayHangouts.length} hangouts created today:`);
    todayHangouts.forEach((hangout, index) => {
      console.log(`   Today ${index + 1}:`, {
        id: hangout.id,
        title: hangout.title,
        status: hangout.status,
        createdAt: hangout.createdAt
      });
    });

    // Check the creator user exists
    console.log('\n5. Checking creator user exists...');
    const creatorId = 'cmgblx1m60000jpmxa83aqu3g';
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    });

    if (creator) {
      console.log('✅ Creator user found:', creator);
    } else {
      console.log('❌ Creator user not found');
    }

  } catch (error) {
    console.error('❌ Error during hangout creation debug:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

debugHangoutCreation();

