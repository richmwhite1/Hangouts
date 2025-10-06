#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up database for Railway deployment...');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

console.log('Environment:', process.env.NODE_ENV);
console.log('Database URL exists:', !!databaseUrl);

if (isProduction && databaseUrl) {
  console.log('✅ Production environment detected with database URL');
  
  try {
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Run migrations
    console.log('🗄️ Running database migrations...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Skipping database setup - not in production or no database URL');
}
