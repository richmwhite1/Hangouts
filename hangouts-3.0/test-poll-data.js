#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPollData() {
  console.log('🔍 Testing poll data in database...');

  try {
    // Get the latest hangout
    const latestHangout = await prisma.content.findFirst({
      where: { type: 'HANGOUT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true }
    });

    if (!latestHangout) {
      console.log('❌ No hangouts found in database');
      return;
    }

    console.log('📊 Latest hangout:', latestHangout);

    // Check for polls for this hangout
    const polls = await prisma.polls.findMany({
      where: { contentId: latestHangout.id },
      include: {
        votes: true
      }
    });

    console.log('📊 Polls found:', polls.length);
    
    if (polls.length > 0) {
      const poll = polls[0];
      console.log('📊 Poll details:');
      console.log('  ID:', poll.id);
      console.log('  Content ID:', poll.contentId);
      console.log('  Status:', poll.status);
      console.log('  Options (JSON):', poll.options);
      console.log('  Votes count:', poll.votes.length);
      console.log('  Expires at:', poll.expiresAt);
      
      if (Array.isArray(poll.options)) {
        console.log('📊 Options array length:', poll.options.length);
        poll.options.forEach((option, index) => {
          console.log(`  Option ${index + 1}:`, {
            id: option.id,
            title: option.title,
            description: option.description
          });
        });
      } else {
        console.log('❌ Options is not an array:', typeof poll.options);
      }
    } else {
      console.log('❌ No polls found for hangout:', latestHangout.id);
    }

    // Check all polls in database
    const allPolls = await prisma.polls.findMany({
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

    console.log('\n📊 All polls in database:', allPolls.length);
    allPolls.forEach((poll, index) => {
      console.log(`  Poll ${index + 1}:`, {
        id: poll.id,
        contentId: poll.contentId,
        status: poll.status,
        optionsCount: Array.isArray(poll.options) ? poll.options.length : 'Not array',
        createdAt: poll.createdAt
      });
    });

  } catch (error) {
    console.error('❌ Error testing poll data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPollData();










