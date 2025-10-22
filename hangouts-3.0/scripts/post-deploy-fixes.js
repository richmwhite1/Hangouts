#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Running post-deploy database fixes...');

async function runPostDeployFixes() {
  try {
    console.log('🔧 Fixing database schema...');
    execSync('node scripts/fix-database-schema.js', { stdio: 'inherit' });
    console.log('✅ Database schema fixed');

    console.log('👥 Fixing friends system...');
    execSync('node scripts/fix-friends-system.js', { stdio: 'inherit' });
    console.log('✅ Friends system fixed');

    console.log('🌱 Running seed script...');
    execSync('node scripts/seed-production.js', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully');

    console.log('🎉 Post-deploy fixes completed successfully!');
  } catch (error) {
    console.error('❌ Post-deploy fixes failed:', error.message);
    // Don't exit - let the app continue running
  }
}

runPostDeployFixes();















