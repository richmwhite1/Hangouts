const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

// Check if we're connecting to production
const databaseUrl = process.env.DATABASE_URL || '';
const isProduction = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required!');
  process.exit(1);
}

if (isProduction) {
  console.log('🌐 Connecting to PRODUCTION database (Railway)...');
} else {
  console.log('⚠️  WARNING: DATABASE_URL does not appear to be a PostgreSQL connection string!');
  process.exit(1);
}

const prisma = new PrismaClient();

async function removeDuplicatesAndFixDates() {
  try {
    console.log('🔍 Finding duplicate events and hangouts...');
    console.log('');

    // Get all events and hangouts
    const allContent = await prisma.content.findMany({
      where: {
        type: {
          in: ['EVENT', 'HANGOUT']
        },
        status: 'PUBLISHED'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Found ${allContent.length} total events and hangouts`);
    console.log('');

    // Group by title and startTime to find duplicates
    const contentMap = new Map();
    const duplicates = [];
    const toKeep = [];

    for (const item of allContent) {
      // Create a key based on title and startTime (rounded to day)
      const startDate = item.startTime ? new Date(item.startTime).toISOString().split('T')[0] : 'no-date';
      const key = `${item.title.toLowerCase().trim()}_${startDate}`;

      if (!contentMap.has(key)) {
        contentMap.set(key, []);
      }
      contentMap.get(key).push(item);
    }

    // Find duplicates
    for (const [key, items] of contentMap.entries()) {
      if (items.length > 1) {
        // Sort by createdAt - keep the oldest one
        items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        toKeep.push(items[0]);
        duplicates.push(...items.slice(1));
      } else {
        toKeep.push(items[0]);
      }
    }

    console.log(`✅ Found ${toKeep.length} unique items`);
    console.log(`🗑️  Found ${duplicates.length} duplicate items to delete`);
    console.log('');

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
    } else {
      console.log('📋 Duplicates to delete:');
      duplicates.forEach((dup, index) => {
        console.log(`   ${index + 1}. ${dup.type}: "${dup.title}" (ID: ${dup.id}, Created: ${new Date(dup.createdAt).toISOString()})`);
      });
      console.log('');

      // Delete duplicates
      console.log('🗑️  Deleting duplicates...');
      for (const dup of duplicates) {
        try {
          await prisma.content.delete({
            where: { id: dup.id }
          });
          console.log(`   ✅ Deleted: ${dup.title} (${dup.id})`);
        } catch (error) {
          console.error(`   ❌ Error deleting ${dup.id}:`, error.message);
        }
      }
      console.log('');
    }

    // Check dates of remaining items
    console.log('📅 Checking dates of remaining items...');
    const now = new Date();
    const futureItems = [];
    const pastItems = [];

    for (const item of toKeep) {
      if (item.startTime) {
        const startTime = new Date(item.startTime);
        // Consider an event "future" if startTime is in the future OR if endTime is in the future
        const endTime = item.endTime ? new Date(item.endTime) : null;
        const isFuture = startTime > now || (endTime && endTime > now);
        
        if (isFuture) {
          futureItems.push(item);
        } else {
          pastItems.push(item);
        }
      } else {
        // No startTime - consider it future for now
        futureItems.push(item);
      }
    }

    console.log(`   ✅ Future items: ${futureItems.length}`);
    console.log(`   📅 Past items: ${pastItems.length}`);
    console.log('');

    // Show some examples
    if (futureItems.length > 0) {
      console.log('📋 Sample future items:');
      futureItems.slice(0, 5).forEach(item => {
        const date = item.startTime ? new Date(item.startTime).toLocaleDateString() : 'No date';
        console.log(`   - ${item.type}: "${item.title}" - ${date}`);
      });
      console.log('');
    }

    if (pastItems.length > 0) {
      console.log('📋 Sample past items:');
      pastItems.slice(0, 5).forEach(item => {
        const date = item.startTime ? new Date(item.startTime).toLocaleDateString() : 'No date';
        console.log(`   - ${item.type}: "${item.title}" - ${date}`);
      });
      console.log('');
    }

    console.log('🎉 Cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Unique items: ${toKeep.length}`);
    console.log(`   🗑️  Deleted duplicates: ${duplicates.length}`);
    console.log(`   📅 Future items: ${futureItems.length}`);
    console.log(`   📅 Past items: ${pastItems.length}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeDuplicatesAndFixDates().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

