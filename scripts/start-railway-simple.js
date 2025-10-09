#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting Railway production deployment...');

async function startProduction() {
  try {
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    console.log('🔧 Environment variables:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  PORT:', process.env.PORT);
    console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // Minimal database setup - only if absolutely necessary
    console.log('🔗 Running minimal database setup...');
    
    try {
      // Just run the essential database push
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema updated');
    } catch (dbError) {
      console.error('❌ Database setup failed:', dbError.message);
      console.log('⚠️ Continuing with startup despite database issues...');
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


