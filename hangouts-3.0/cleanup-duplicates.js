const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('🧹 Cleaning up duplicate content...');

    // Get all content grouped by title
    const contentGroups = await prisma.content.groupBy({
      by: ['title'],
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });

    console.log(`📊 Found ${contentGroups.length} titles with duplicates`);

    for (const group of contentGroups) {
      console.log(`\n🔍 Processing: "${group.title}" (${group._count.id} duplicates)`);
      
      // Get all content with this title
      const duplicates = await prisma.content.findMany({
        where: { title: group.title },
        orderBy: { createdAt: 'asc' }
      });

      // Keep the first one, delete the rest
      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);

      console.log(`   ✅ Keeping: ${toKeep.id} (created: ${toKeep.createdAt})`);
      
      for (const item of toDelete) {
        console.log(`   🗑️  Deleting: ${item.id} (created: ${item.createdAt})`);
        
        // Delete related data first
        await prisma.rsvp.deleteMany({ where: { contentId: item.id } });
        await prisma.polls.deleteMany({ where: { contentId: item.id } });
        
        // Delete the content
        await prisma.content.delete({ where: { id: item.id } });
      }
    }

    // Final count
    const finalCount = await prisma.content.count();
    console.log(`\n📊 Final content count: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();












