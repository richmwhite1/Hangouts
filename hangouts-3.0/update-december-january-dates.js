const { PrismaClient } = require('@prisma/client');

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

// Map of event titles to new dates (December 2025 and January 2026)
const dateUpdates = {
  "Winter Wonderland Festival": {
    startTime: new Date('2025-12-15T16:00:00Z'),
    endTime: new Date('2025-12-15T22:00:00Z')
  },
  "New Year's Eve Gala": {
    startTime: new Date('2025-12-31T20:00:00Z'),
    endTime: new Date('2026-01-01T02:00:00Z')
  },
  "Holiday Jazz Concert Series": {
    startTime: new Date('2025-12-20T19:30:00Z'),
    endTime: new Date('2025-12-20T22:30:00Z')
  },
  "Ice Skating Under the Stars": {
    startTime: new Date('2025-12-22T18:00:00Z'),
    endTime: new Date('2025-12-22T21:00:00Z')
  },
  "Holiday Food & Wine Tasting": {
    startTime: new Date('2025-12-18T19:00:00Z'),
    endTime: new Date('2025-12-18T22:00:00Z')
  },
  "New Year Resolution Run": {
    startTime: new Date('2026-01-05T09:00:00Z'),
    endTime: new Date('2026-01-05T12:00:00Z')
  },
  "Winter Art Gallery Opening": {
    startTime: new Date('2026-01-12T18:00:00Z'),
    endTime: new Date('2026-01-12T21:00:00Z')
  },
  "Comedy Night: Fresh Start": {
    startTime: new Date('2026-01-10T20:00:00Z'),
    endTime: new Date('2026-01-10T23:00:00Z')
  },
  "Cozy Coffee & Book Exchange": {
    startTime: new Date('2025-12-14T14:00:00Z'),
    endTime: new Date('2025-12-14T17:00:00Z')
  },
  "New Year Brunch & Goal Setting": {
    startTime: new Date('2026-01-04T11:00:00Z'),
    endTime: new Date('2026-01-04T14:00:00Z')
  }
};

async function updateDates() {
  try {
    console.log('📅 Updating December and January event dates to future dates...');
    console.log('');

    let updated = 0;
    let notFound = 0;

    for (const [title, dates] of Object.entries(dateUpdates)) {
      try {
        const result = await prisma.content.updateMany({
          where: {
            title: title,
            type: {
              in: ['EVENT', 'HANGOUT']
            }
          },
          data: {
            startTime: dates.startTime,
            endTime: dates.endTime,
            updatedAt: new Date()
          }
        });

        if (result.count > 0) {
          console.log(`✅ Updated "${title}": ${result.count} item(s)`);
          updated += result.count;
        } else {
          console.log(`⚠️  Not found: "${title}"`);
          notFound++;
        }
      } catch (error) {
        console.error(`❌ Error updating "${title}":`, error.message);
      }
    }

    console.log('');
    console.log('🎉 Date update completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Updated: ${updated} items`);
    console.log(`   ⚠️  Not found: ${notFound} items`);

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateDates().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});




