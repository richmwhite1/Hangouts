const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addUserRSVPs() {
  try {
    console.log('🎫 Adding RSVPs for current user...');

    const currentUser = await prisma.user.findFirst({
      where: { id: 'cmgaarzou0000o50f6pxaekfh' }
    });

    if (!currentUser) {
      console.log('❌ Current user not found');
      return;
    }

    // Get some content to RSVP to
    const content = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        type: { in: ['EVENT', 'HANGOUT'] }
      },
      take: 5
    });

    console.log(`📄 Found ${content.length} content items to RSVP to`);

    for (const item of content) {
      try {
        await prisma.rsvp.create({
          data: {
            contentId: item.id,
            userId: currentUser.id,
            status: 'YES',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`✅ RSVP'd YES to ${item.type}: ${item.title}`);
      } catch (error) {
        console.log(`⚠️  RSVP already exists or error: ${error.message}`);
      }
    }

    console.log('\n🎉 RSVPs added successfully!');

  } catch (error) {
    console.error('❌ Error adding RSVPs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUserRSVPs();




















