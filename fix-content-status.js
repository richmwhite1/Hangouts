const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixContentStatus() {
  try {
    console.log('🔧 Fixing content status...');

    // Update all content to have PUBLISHED status
    const result = await prisma.content.updateMany({
      where: {
        status: 'DRAFT' // or any other status
      },
      data: {
        status: 'PUBLISHED'
      }
    });

    console.log(`✅ Updated ${result.count} content items to PUBLISHED status`);

    // Also update privacyLevel to PUBLIC for discover page
    const privacyResult = await prisma.content.updateMany({
      where: {
        privacyLevel: 'PRIVATE'
      },
      data: {
        privacyLevel: 'PUBLIC'
      }
    });

    console.log(`✅ Updated ${privacyResult.count} content items to PUBLIC privacy`);

    // Check final status
    const content = await prisma.content.findMany({
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        privacyLevel: true
      }
    });

    console.log(`📊 Final content status:`);
    content.forEach(item => {
      console.log(`   - ${item.type}: ${item.title} (Status: ${item.status}, Privacy: ${item.privacyLevel})`);
    });

  } catch (error) {
    console.error('❌ Error fixing content status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixContentStatus();
