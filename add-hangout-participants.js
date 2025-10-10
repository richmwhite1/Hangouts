const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

// Generate unique ID
function generateId() {
  return randomBytes(16).toString('hex');
}

async function addHangoutParticipants() {
  try {
    console.log('👥 Adding participants to hangouts...');

    // Get all hangouts
    const hangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      select: {
        id: true,
        title: true,
        creatorId: true
      }
    });

    console.log(`📊 Found ${hangouts.length} hangouts`);

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    console.log(`👤 Found ${users.length} users`);

    for (const hangout of hangouts) {
      try {
        // Get existing participants
        const existingParticipants = await prisma.content_participants.findMany({
          where: { contentId: hangout.id },
          select: { userId: true }
        });

        const existingUserIds = existingParticipants.map(p => p.userId);

        // Add 3-8 random participants (excluding creator)
        const availableUsers = users.filter(u => 
          u.id !== hangout.creatorId && !existingUserIds.includes(u.id)
        );

        const numParticipants = Math.min(
          Math.floor(Math.random() * 6) + 3, // 3-8 participants
          availableUsers.length
        );

        const selectedUsers = availableUsers
          .sort(() => 0.5 - Math.random())
          .slice(0, numParticipants);

        console.log(`🎉 Adding ${selectedUsers.length} participants to: ${hangout.title}`);

        for (const user of selectedUsers) {
          try {
            await prisma.content_participants.create({
              data: {
                id: generateId(),
                contentId: hangout.id,
                userId: user.id,
                role: 'MEMBER',
                canEdit: false,
                isMandatory: Math.random() > 0.7, // 30% chance of being mandatory
                isCoHost: Math.random() > 0.8, // 20% chance of being co-host
                invitedAt: new Date(),
                joinedAt: new Date()
              }
            });

            // Also add RSVP
            const rsvpStatuses = ['YES', 'MAYBE', 'NO'];
            const status = rsvpStatuses[Math.floor(Math.random() * rsvpStatuses.length)];

            await prisma.rsvp.create({
              data: {
                contentId: hangout.id,
                userId: user.id,
                status: status,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });

            console.log(`   ✅ Added ${user.name} as participant (RSVP: ${status})`);
          } catch (error) {
            console.log(`   ⚠️  Error adding ${user.name}: ${error.message}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing hangout ${hangout.title}:`, error.message);
      }
    }

    console.log('🎉 Hangout participants added successfully!');

  } catch (error) {
    console.error('❌ Error adding hangout participants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addHangoutParticipants();
