#!/usr/bin/env node

// Test database configuration
console.log('🔍 Debugging database configuration...');

console.log('\n1. Environment variables:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'Not set');

if (process.env.DATABASE_URL) {
  // Mask the password in the URL for security
  const maskedUrl = process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@');
  console.log('   DATABASE_URL (masked):', maskedUrl);
}

console.log('\n2. Testing database connection with current config...');

const { PrismaClient } = require('@prisma/client');

// Use the same configuration as the app
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testDatabaseConfig() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Test user lookup
    const user = await prisma.user.findUnique({
      where: { email: 'richard@example.com' },
      select: { id: true, username: true, name: true, email: true }
    });

    if (user) {
      console.log('✅ User found:', user);
    } else {
      console.log('❌ User not found');
    }

    // Test hangout creation
    console.log('\n3. Testing hangout creation...');
    const testHangout = await prisma.content.create({
      data: {
        id: `test_hangout_${Date.now()}`,
        type: 'HANGOUT',
        title: 'Test Hangout for Database Config',
        description: 'Testing database configuration',
        location: 'Test Location',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id, // Use the correct user ID
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Test hangout created:', testHangout.id);

    // Test poll creation
    console.log('\n4. Testing poll creation...');
    const testPoll = await prisma.polls.create({
      data: {
        id: `test_poll_${Date.now()}`,
        contentId: testHangout.id,
        creatorId: user.id,
        title: 'Test Poll for Database Config',
        description: 'Testing poll creation',
        options: [
          {
            id: 'option_1',
            title: 'Option 1',
            description: 'First option'
          },
          {
            id: 'option_2',
            title: 'Option 2',
            description: 'Second option'
          }
        ],
        allowMultiple: false,
        isAnonymous: false,
        status: 'ACTIVE',
        consensusPercentage: 70,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    console.log('✅ Test poll created:', testPoll.id);

    // Clean up test data
    await prisma.polls.delete({ where: { id: testPoll.id } });
    await prisma.content.delete({ where: { id: testHangout.id } });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Database config test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConfig();















