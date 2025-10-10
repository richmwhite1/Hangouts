#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Setting up database...');

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
  console.error('Continuing anyway...');
}
