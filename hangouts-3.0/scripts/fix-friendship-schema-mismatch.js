#!/usr/bin/env node

/**
 * Fix Friendship Schema Mismatch
 * 
 * This script addresses the critical schema mismatch between development and production:
 * 
 * DEVELOPMENT SCHEMA (schema.prisma):
 * - Uses userId/friendId fields (bidirectional model)
 * - Relations: "UserFriendships" and "FriendFriendships"
 * - Includes status and desiredHangoutFrequency fields
 * 
 * PRODUCTION SCHEMA (schema-production.prisma):
 * - Uses user1Id/user2Id fields (symmetric model)
 * - Relations: "User1" and "User2"
 * - Only has basic fields (id, user1Id, user2Id, createdAt)
 * 
 * SOLUTION: Standardize on the development schema (userId/friendId) as it's more flexible
 * and matches social media best practices for asymmetric relationships.
 */

const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
    }
  }
});

async function analyzeCurrentSchema() {
  console.log('🔍 Analyzing current production schema...');
  
  try {
    // Try to query using production schema (user1Id/user2Id)
    const productionFriendships = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'friendships' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Current friendships table schema:');
    console.table(productionFriendships);
    
    // Count existing friendships
    const friendshipCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM friendships`;
    console.log(`📊 Current friendship count: ${friendshipCount[0].count}`);
    
    // Sample existing data
    const sampleFriendships = await prisma.$queryRaw`
      SELECT * FROM friendships LIMIT 5;
    `;
    console.log('📝 Sample friendship data:');
    console.table(sampleFriendships);
    
    return {
      hasUser1Id: productionFriendships.some(col => col.column_name === 'user1Id'),
      hasUserId: productionFriendships.some(col => col.column_name === 'userId'),
      hasStatus: productionFriendships.some(col => col.column_name === 'status'),
      count: parseInt(friendshipCount[0].count)
    };
    
  } catch (error) {
    console.error('❌ Error analyzing schema:', error);
    throw error;
  }
}

async function migrateFriendshipSchema(dryRun = true) {
  console.log(`🚀 ${dryRun ? 'DRY RUN:' : 'EXECUTING:'} Migrating friendship schema...`);
  
  const analysis = await analyzeCurrentSchema();
  
  if (analysis.hasUserId && !analysis.hasUser1Id) {
    console.log('✅ Schema already uses userId/friendId format - no migration needed');
    return;
  }
  
  if (!analysis.hasUser1Id && !analysis.hasUserId) {
    console.log('❌ Unknown schema format detected');
    return;
  }
  
  console.log('🔄 Converting from user1Id/user2Id to userId/friendId format...');
  
  if (!dryRun) {
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Add new columns if they don't exist
        console.log('📝 Adding new columns...');
        
        await tx.$executeRaw`
          ALTER TABLE friendships 
          ADD COLUMN IF NOT EXISTS "userId" TEXT,
          ADD COLUMN IF NOT EXISTS "friendId" TEXT,
          ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE',
          ADD COLUMN IF NOT EXISTS "desiredHangoutFrequency" TEXT,
          ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `;
        
        // Step 2: Migrate data from user1Id/user2Id to userId/friendId
        console.log('🔄 Migrating existing friendship data...');
        
        // Create bidirectional friendships from symmetric ones
        await tx.$executeRaw`
          UPDATE friendships 
          SET "userId" = "user1Id", "friendId" = "user2Id"
          WHERE "userId" IS NULL;
        `;
        
        // Create reverse friendships for bidirectional relationships
        await tx.$executeRaw`
          INSERT INTO friendships (id, "userId", "friendId", status, "createdAt", "updatedAt")
          SELECT 
            'friendship_' || EXTRACT(EPOCH FROM NOW()) || '_' || RANDOM()::TEXT,
            "user2Id",
            "user1Id", 
            'ACTIVE',
            "createdAt",
            CURRENT_TIMESTAMP
          FROM friendships 
          WHERE "user1Id" IS NOT NULL 
          AND NOT EXISTS (
            SELECT 1 FROM friendships f2 
            WHERE f2."userId" = friendships."user2Id" 
            AND f2."friendId" = friendships."user1Id"
          );
        `;
        
        // Step 3: Add constraints and indexes
        console.log('🔧 Adding constraints and indexes...');
        
        await tx.$executeRaw`
          CREATE UNIQUE INDEX IF NOT EXISTS "friendships_userId_friendId_key" 
          ON friendships("userId", "friendId");
        `;
        
        await tx.$executeRaw`
          CREATE INDEX IF NOT EXISTS "friendships_userId_idx" ON friendships("userId");
        `;
        
        await tx.$executeRaw`
          CREATE INDEX IF NOT EXISTS "friendships_friendId_idx" ON friendships("friendId");
        `;
        
        // Step 4: Add foreign key constraints
        await tx.$executeRaw`
          ALTER TABLE friendships 
          ADD CONSTRAINT IF NOT EXISTS "friendships_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
        `;
        
        await tx.$executeRaw`
          ALTER TABLE friendships 
          ADD CONSTRAINT IF NOT EXISTS "friendships_friendId_fkey" 
          FOREIGN KEY ("friendId") REFERENCES users(id) ON DELETE CASCADE;
        `;
        
        // Step 5: Remove old columns (optional - keep for safety)
        console.log('⚠️  Keeping old columns for safety (user1Id, user2Id)');
        // await tx.$executeRaw`ALTER TABLE friendships DROP COLUMN IF EXISTS "user1Id", DROP COLUMN IF EXISTS "user2Id";`;
      });
      
      console.log('✅ Schema migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } else {
    console.log('📋 DRY RUN: Would execute the above migration steps');
  }
}

async function validateMigration() {
  console.log('🔍 Validating migration...');
  
  try {
    // Check new schema
    const newSchema = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'friendships' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 New friendships table schema:');
    console.table(newSchema);
    
    // Count friendships
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM friendships WHERE "userId" IS NOT NULL`;
    console.log(`📊 Friendships with new schema: ${count[0].count}`);
    
    // Sample new data
    const sample = await prisma.$queryRaw`
      SELECT id, "userId", "friendId", status, "createdAt" 
      FROM friendships 
      WHERE "userId" IS NOT NULL 
      LIMIT 5;
    `;
    console.log('📝 Sample migrated data:');
    console.table(sample);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  console.log('🔧 Friendship Schema Migration Tool');
  console.log('=====================================');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Use --execute flag to apply changes');
  }
  
  try {
    await analyzeCurrentSchema();
    await migrateFriendshipSchema(dryRun);
    
    if (!dryRun) {
      await validateMigration();
    }
    
    console.log('\n✅ Migration process completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeCurrentSchema, migrateFriendshipSchema, validateMigration };









