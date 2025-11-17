const { PrismaClient } = require('@prisma/client');

// Check if we're connecting to production
const databaseUrl = process.env.DATABASE_URL || '';
const isProduction = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required!');
  console.error('');
  console.error('To update production database, you need to:');
  console.error('1. Get your DATABASE_URL from Railway dashboard');
  console.error('2. Run: DATABASE_URL="postgresql://..." node publish-all-content.js');
  console.error('   OR use Railway CLI: railway run node publish-all-content.js');
  process.exit(1);
}

if (isProduction) {
  console.log('🌐 Connecting to PRODUCTION database (Railway)...');
} else {
  console.log('⚠️  WARNING: DATABASE_URL does not appear to be a PostgreSQL connection string!');
  console.log('   Production database requires PostgreSQL (postgresql:// or postgres://)');
  process.exit(1);
}

const prisma = new PrismaClient();

async function publishAllContent() {
  try {
    console.log('🔍 Checking content status in production database...');
    console.log('');

    // Get all content items
    const allContent = await prisma.content.findMany({
      where: {
        type: {
          in: ['EVENT', 'HANGOUT']
        }
      },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        privacyLevel: true
      }
    });

    console.log(`📊 Found ${allContent.length} total events and hangouts`);
    console.log('');

    // Count by status
    const statusCounts = {
      PUBLISHED: 0,
      DRAFT: 0,
      ARCHIVED: 0,
      DELETED: 0
    };

    allContent.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    console.log('📈 Current status breakdown:');
    console.log(`   ✅ PUBLISHED: ${statusCounts.PUBLISHED}`);
    console.log(`   📝 DRAFT: ${statusCounts.DRAFT}`);
    console.log(`   📦 ARCHIVED: ${statusCounts.ARCHIVED}`);
    console.log(`   🗑️  DELETED: ${statusCounts.DELETED}`);
    console.log('');

    // Find items that need to be published
    const itemsToPublish = allContent.filter(item => item.status !== 'PUBLISHED');

    if (itemsToPublish.length === 0) {
      console.log('✅ All events and hangouts are already PUBLISHED!');
      return;
    }

    console.log(`🔄 Found ${itemsToPublish.length} items that need to be published:`);
    itemsToPublish.forEach(item => {
      console.log(`   - ${item.type}: "${item.title}" (currently ${item.status})`);
    });
    console.log('');

    // Update all non-published items to PUBLISHED
    console.log('📝 Updating items to PUBLISHED status...');
    
    const updateResult = await prisma.content.updateMany({
      where: {
        type: {
          in: ['EVENT', 'HANGOUT']
        },
        status: {
          not: 'PUBLISHED'
        }
      },
      data: {
        status: 'PUBLISHED',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Successfully updated ${updateResult.count} items to PUBLISHED status`);
    console.log('');

    // Verify the update
    const publishedCount = await prisma.content.count({
      where: {
        type: {
          in: ['EVENT', 'HANGOUT']
        },
        status: 'PUBLISHED'
      }
    });

    const totalCount = await prisma.content.count({
      where: {
        type: {
          in: ['EVENT', 'HANGOUT']
        }
      }
    });

    console.log('📊 Final status:');
    console.log(`   ✅ PUBLISHED: ${publishedCount} / ${totalCount}`);
    console.log('');

    if (publishedCount === totalCount) {
      console.log('🎉 All events and hangouts are now PUBLISHED!');
    } else {
      console.log(`⚠️  Warning: ${totalCount - publishedCount} items are still not PUBLISHED`);
    }

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
publishAllContent().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

