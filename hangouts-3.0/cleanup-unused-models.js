const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupUnusedModels() {
  try {
    console.log('🧹 Starting cleanup of unused models...');

    // Step 1: Drop unused tables
    console.log('📝 Step 1: Dropping unused tables...');
    
    const tablesToDrop = [
      'albums',
      'community_details', 
      'conversation_participants',
      'conversations',
      'group_members',
      'groups',
      'itinerary_items',
      'tasks',
      'user_preferences',
      'event_details', // Will be replaced by unified content fields
      'hangout_details', // Will be replaced by unified content fields
      'event', // Migrated to content table
      'event_images', // Will be recreated with contentId
      'event_tags', // Will be recreated with contentId
      'event_saves' // Will be recreated with contentId
    ];

    for (const table of tablesToDrop) {
      try {
        await prisma.$executeRaw`DROP TABLE IF EXISTS ${table};`;
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }

    // Step 2: Remove old columns from content table
    console.log('📝 Step 2: Removing old columns from content table...');
    
    const columnsToRemove = [
      'conversationId' // Remove from messages table
    ];

    for (const column of columnsToRemove) {
      try {
        await prisma.$executeRaw`ALTER TABLE messages DROP COLUMN IF EXISTS ${column};`;
        console.log(`✅ Removed column: messages.${column}`);
      } catch (error) {
        console.log(`⚠️  Could not remove column messages.${column}: ${error.message}`);
      }
    }

    // Step 3: Remove old columns from photos table
    console.log('📝 Step 3: Removing old columns from photos table...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE photos DROP COLUMN IF EXISTS hangoutId;`;
      await prisma.$executeRaw`ALTER TABLE photos DROP COLUMN IF EXISTS albumId;`;
      console.log('✅ Removed old columns from photos table');
    } catch (error) {
      console.log(`⚠️  Could not remove old columns from photos: ${error.message}`);
    }

    // Step 4: Remove old columns from polls table
    console.log('📝 Step 4: Removing old columns from polls table...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE polls DROP COLUMN IF EXISTS hangoutId;`;
      console.log('✅ Removed hangoutId from polls table');
    } catch (error) {
      console.log(`⚠️  Could not remove hangoutId from polls: ${error.message}`);
    }

    // Step 5: Remove old columns from rsvp table
    console.log('📝 Step 5: Removing old columns from rsvp table...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE rsvps DROP COLUMN IF EXISTS hangoutId;`;
      console.log('✅ Removed hangoutId from rsvp table');
    } catch (error) {
      console.log(`⚠️  Could not remove hangoutId from rsvp: ${error.message}`);
    }

    // Step 6: Remove old columns from finalPlan table
    console.log('📝 Step 6: Removing old columns from finalPlan table...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE final_plans DROP COLUMN IF EXISTS hangoutId;`;
      console.log('✅ Removed hangoutId from finalPlan table');
    } catch (error) {
      console.log(`⚠️  Could not remove hangoutId from finalPlan: ${error.message}`);
    }

    // Step 7: Remove old columns from User table
    console.log('📝 Step 7: Removing old columns from User table...');
    
    const userColumnsToRemove = [
      'albums',
      'audit_logs', 
      'conversation_participants',
      'group_members',
      'groups',
      'user_preferences'
    ];

    for (const column of userColumnsToRemove) {
      try {
        await prisma.$executeRaw`ALTER TABLE users DROP COLUMN IF EXISTS ${column};`;
        console.log(`✅ Removed column: users.${column}`);
      } catch (error) {
        console.log(`⚠️  Could not remove column users.${column}: ${error.message}`);
      }
    }

    console.log('🎉 Cleanup completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Update the schema.prisma file with the unified structure');
    console.log('2. Run: npx prisma db push');
    console.log('3. Update API endpoints to use unified structure');
    console.log('4. Update frontend components');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUnusedModels().catch(console.error);














