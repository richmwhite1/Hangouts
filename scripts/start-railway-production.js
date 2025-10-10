#!/usr/bin/env node

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

console.log('🚀 Starting Railway production deployment...');

async function startProduction() {
  try {
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    console.log('🔧 Environment variables:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  PORT:', process.env.PORT);
    console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // Test database connection
    console.log('🔗 Testing database connection...');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Check if tables exist
      const tableCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      console.log('📊 Database tables:', tableCount[0].count);
      
      if (tableCount[0].count === 0) {
        console.log('🔄 No tables found, running database migration...');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        console.log('✅ Database migration completed');
        
        // Fix database schema (add missing columns)
        console.log('🔧 Fixing database schema...');
        execSync('node scripts/fix-database-schema.js', { stdio: 'inherit' });
        console.log('✅ Database schema fixed');

        // Run seed script
        console.log('🌱 Running seed script...');
        execSync('node scripts/seed-production.js', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully');
      } else {
        console.log('✅ Database tables already exist, skipping migration');
        
        // Check if users exist
        const userCount = await prisma.user.count();
        console.log('👥 Users in database:', userCount);
        
        // Always run schema fix for existing databases
        console.log('🔧 Fixing database schema...');
        execSync('node scripts/fix-database-schema.js', { stdio: 'inherit' });
        console.log('✅ Database schema fixed');

        // Fix friends system
        console.log('👥 Fixing friends system...');
        execSync('node scripts/fix-friends-system.js', { stdio: 'inherit' });
        console.log('✅ Friends system fixed');

        if (userCount === 0) {
          console.log('🌱 No users found, running seed script...');
          execSync('node scripts/seed-production.js', { stdio: 'inherit' });
          console.log('✅ Database seeded successfully');
        }
      }
      
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      console.log('🔄 Attempting to create database schema...');
      
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        console.log('✅ Database schema created');
        
        // Fix database schema (add missing columns)
        console.log('🔧 Fixing database schema...');
        execSync('node scripts/fix-database-schema.js', { stdio: 'inherit' });
        console.log('✅ Database schema fixed');
        
        execSync('node scripts/seed-production.js', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully');
      } catch (migrationError) {
        console.error('❌ Database migration failed:', migrationError.message);
        throw migrationError;
      }
    } finally {
      await prisma.$disconnect();
    }
    
        console.log('🚀 Starting Next.js production server...');

        // Start Next.js production server
        execSync('npx next start', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Production startup failed:', error.message);
    process.exit(1);
  }
}

startProduction();
