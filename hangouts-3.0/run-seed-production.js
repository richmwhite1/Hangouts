#!/usr/bin/env node

// Simple script to run the production seeding
// This will be executed on Railway after deployment

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running production data seeding...');

try {
  // Run the seeding script
  const scriptPath = path.join(__dirname, 'scripts', 'seed-production-data.js');
  execSync(`node ${scriptPath}`, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL
    }
  });
  
  console.log('✅ Production data seeding completed successfully!');
} catch (error) {
  console.error('❌ Error running production seeding:', error.message);
  process.exit(1);
}
