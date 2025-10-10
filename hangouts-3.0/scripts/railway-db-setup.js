#!/usr/bin/env node

/**
 * Railway Database Setup Script
 * This script handles database setup for Railway deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Railway database setup...');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

console.log('🔧 Environment check:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  DATABASE_URL exists: ${!!databaseUrl}`);
console.log(`  DATABASE_URL type: ${databaseUrl ? (databaseUrl.startsWith('postgres') ? 'PostgreSQL' : 'Other') : 'Not set'}`);

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

if (isProduction && !databaseUrl.startsWith('postgres')) {
  console.error('❌ Production requires PostgreSQL database');
  process.exit(1);
}

try {
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🗄️ Pushing database schema...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('✅ Database setup completed successfully!');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  
  // In production, we might want to continue even if database setup fails
  if (isProduction) {
    console.log('⚠️ Continuing with startup despite database issues...');
  } else {
    process.exit(1);
  }
}
