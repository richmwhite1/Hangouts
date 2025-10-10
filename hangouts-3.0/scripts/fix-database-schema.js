#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema...');
  
  try {
    // Check if the columns already exist
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('favoriteActivities', 'favoritePlaces')
    `;
    
    const existingColumns = result.map(row => row.column_name);
    console.log('📊 Existing columns:', existingColumns);
    
    // Add favoriteActivities column if it doesn't exist
    if (!existingColumns.includes('favoriteActivities')) {
      console.log('➕ Adding favoriteActivities column...');
      await prisma.$executeRaw`
        ALTER TABLE "users" 
        ADD COLUMN "favoriteActivities" TEXT DEFAULT '[]'
      `;
      console.log('✅ favoriteActivities column added');
    } else {
      console.log('✅ favoriteActivities column already exists');
    }
    
    // Add favoritePlaces column if it doesn't exist
    if (!existingColumns.includes('favoritePlaces')) {
      console.log('➕ Adding favoritePlaces column...');
      await prisma.$executeRaw`
        ALTER TABLE "users" 
        ADD COLUMN "favoritePlaces" TEXT DEFAULT '[]'
      `;
      console.log('✅ favoritePlaces column added');
    } else {
      console.log('✅ favoritePlaces column already exists');
    }
    
    // Update existing users to have default values
    console.log('🔄 Updating existing users with default values...');
    await prisma.user.updateMany({
      where: {
        OR: [
          { favoriteActivities: null },
          { favoritePlaces: null }
        ]
      },
      data: {
        favoriteActivities: '[]',
        favoritePlaces: '[]'
      }
    });
    
    console.log('✅ Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabaseSchema().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

