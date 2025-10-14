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

async function debugPollCreation() {
  console.log('🔍 Debugging poll creation in Railway database...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  try {
    // Test database connection
    console.log('\n1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Check if polls table exists and is accessible
    console.log('\n2. Checking polls table...');
    const pollCount = await prisma.polls.count();
    console.log(`✅ Polls table accessible, count: ${pollCount}`);

    // Check recent polls
    console.log('\n3. Recent polls in database:');
    const recentPolls = await prisma.polls.findMany({
      select: {
        id: true,
        contentId: true,
        status: true,
        options: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    recentPolls.forEach((poll, index) => {
      console.log(`   Poll ${index + 1}:`, {
        id: poll.id,
        contentId: poll.contentId,
        status: poll.status,
        optionsCount: Array.isArray(poll.options) ? poll.options.length : 'Not array',
        createdAt: poll.createdAt
      });
    });

    // Test creating a simple poll
    console.log('\n4. Testing poll creation...');
    const testPollData = {
      id: `test_poll_${Date.now()}`,
      contentId: `test_hangout_${Date.now()}`,
      creatorId: 'cmgblx1m60000jpmxa83aqu3g', // Richard's ID
      title: 'Test Poll Creation',
      description: 'Testing poll creation in Railway database',
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
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };

    console.log('Creating test poll with data:', JSON.stringify(testPollData, null, 2));

    const testPoll = await prisma.polls.create({
      data: testPollData
    });

    console.log('✅ Test poll created successfully:', testPoll.id);

    // Verify the poll was created
    const createdPoll = await prisma.polls.findUnique({
      where: { id: testPoll.id },
      include: {
        votes: true
      }
    });

    if (createdPoll) {
      console.log('✅ Poll verification successful:');
      console.log('   ID:', createdPoll.id);
      console.log('   Status:', createdPoll.status);
      console.log('   Options:', createdPoll.options);
      console.log('   Votes count:', createdPoll.votes.length);
    } else {
      console.log('❌ Poll verification failed - poll not found');
    }

    // Clean up test poll
    await prisma.polls.delete({
      where: { id: testPoll.id }
    });
    console.log('✅ Test poll cleaned up');

  } catch (error) {
    console.error('❌ Error during poll creation debug:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

debugPollCreation();








