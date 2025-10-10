#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductionHangouts() {
  console.log('🔍 Checking hangouts in production database...');

  try {
    // Check total hangouts
    const totalHangouts = await prisma.content.count({
      where: { type: 'HANGOUT' }
    });
    console.log(`📊 Total hangouts in database: ${totalHangouts}`);

    // Get all hangouts with basic info
    const hangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        creatorId: true,
        createdAt: true,
        startTime: true,
        endTime: true,
        location: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('\n📋 Recent hangouts:');
    hangouts.forEach((hangout, index) => {
      console.log(`${index + 1}. ID: ${hangout.id}`);
      console.log(`   Title: ${hangout.title || 'No title'}`);
      console.log(`   Status: ${hangout.status}`);
      console.log(`   Creator: ${hangout.creatorId}`);
      console.log(`   Created: ${hangout.createdAt}`);
      console.log(`   Start: ${hangout.startTime}`);
      console.log(`   Location: ${hangout.location || 'No location'}`);
      console.log('');
    });

    // Check if there are any hangouts with specific ID from the error
    const testHangoutId = 'hangout_1759601089881_btpk0an6h';
    const testHangout = await prisma.content.findUnique({
      where: { id: testHangoutId },
      select: {
        id: true,
        title: true,
        status: true,
        type: true
      }
    });

    if (testHangout) {
      console.log(`✅ Test hangout found: ${testHangout.title} (${testHangout.status})`);
    } else {
      console.log(`❌ Test hangout ${testHangoutId} not found in database`);
      console.log('   This explains the 502 error - the hangout doesn\'t exist');
    }

    // Check hangout participants
    const hangoutsWithParticipants = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      include: {
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      },
      take: 5
    });

    console.log('\n👥 Hangouts with participants:');
    hangoutsWithParticipants.forEach((hangout, index) => {
      console.log(`${index + 1}. ${hangout.title || 'No title'} (${hangout.id})`);
      console.log(`   Participants: ${hangout.content_participants.length}`);
      hangout.content_participants.forEach(participant => {
        console.log(`     - ${participant.users.name} (${participant.users.username})`);
      });
      console.log('');
    });

    // Check RSVPs
    const rsvps = await prisma.rsvp.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      take: 10
    });

    console.log(`\n📝 RSVPs in database: ${rsvps.length}`);
    rsvps.forEach((rsvp, index) => {
      console.log(`${index + 1}. Content: ${rsvp.contentId}, User: ${rsvp.userId}, Status: ${rsvp.status}`);
    });

  } catch (error) {
    console.error('❌ Error checking hangouts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionHangouts();



