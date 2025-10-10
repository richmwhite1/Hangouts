#!/usr/bin/env node

/**
 * Final Validation Script for Clerk Authentication + Railway Deployment
 * Validates that everything is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Final Validation for Clerk + Railway Deployment');
console.log('====================================================\n');

let allChecksPassed = true;

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${filePath} - MISSING`);
    allChecksPassed = false;
    return false;
  }
}

function checkContent(filePath, content, description) {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.includes(content)) {
      console.log(`✅ ${description}`);
      return true;
    } else {
      console.log(`❌ ${description} - Content not found`);
      allChecksPassed = false;
      return false;
    }
  } else {
    console.log(`❌ ${description} - File not found`);
    allChecksPassed = false;
    return false;
  }
}

// Core Clerk Configuration
console.log('📋 Core Clerk Configuration:');
checkFile('src/app/layout.tsx', 'Layout with ClerkProvider');
checkContent('src/app/layout.tsx', 'ClerkProvider', 'ClerkProvider imported and used');
checkFile('src/middleware.ts', 'Middleware configuration');
checkContent('src/middleware.ts', 'NextRequest', 'Middleware uses Next.js types');
checkFile('src/app/login/[[...rest]]/page.tsx', 'Login page');
checkContent('src/app/login/[[...rest]]/page.tsx', 'SignIn', 'Login page uses Clerk SignIn');
checkFile('src/app/signup/[[...rest]]/page.tsx', 'Signup page');
checkContent('src/app/signup/[[...rest]]/page.tsx', 'SignUp', 'Signup page uses Clerk SignUp');

// Authentication Integration
console.log('\n🔐 Authentication Integration:');
checkContent('src/app/page.tsx', 'useAuth', 'Main page uses Clerk hooks');
checkContent('src/app/page.tsx', 'useUser', 'Main page uses user data');
checkContent('src/app/page.tsx', 'isSignedIn', 'Main page checks auth state');

// Railway Configuration
console.log('\n🚂 Railway Configuration:');
checkFile('railway.json', 'Railway configuration');
checkFile('package.json', 'Package.json with scripts');
checkContent('package.json', '"start":', 'Start script configured');
checkContent('package.json', '"build":', 'Build script configured');
checkContent('package.json', '@clerk/nextjs', 'Clerk dependency installed');

// Environment Setup
console.log('\n🌍 Environment Setup:');
const envFiles = ['.env.local', '.env'];
let envFound = false;
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    envFound = true;
    console.log(`✅ Environment file found: ${envFile}`);
    const envContent = fs.readFileSync(envFile, 'utf8');
    if (envContent.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')) {
      console.log('✅ Clerk publishable key configured');
    } else {
      console.log('❌ Clerk publishable key missing');
      allChecksPassed = false;
    }
    if (envContent.includes('CLERK_SECRET_KEY')) {
      console.log('✅ Clerk secret key configured');
    } else {
      console.log('❌ Clerk secret key missing');
      allChecksPassed = false;
    }
    break;
  }
}

if (!envFound) {
  console.log('❌ No environment file found');
  allChecksPassed = false;
}

// Deployment Files
console.log('\n📦 Deployment Files:');
checkFile('.github/workflows/deploy.yml', 'GitHub Actions workflow');
checkFile('deploy-to-railway.js', 'Railway deployment script');
checkFile('test-clerk-auth.js', 'Authentication test script');
checkFile('RAILWAY_CLERK_DEPLOYMENT.md', 'Deployment documentation');
checkFile('CLERK_SETUP_INSTRUCTIONS.md', 'Setup instructions');

// Next.js Configuration
console.log('\n⚙️ Next.js Configuration:');
checkFile('next.config.ts', 'Next.js configuration');
checkContent('next.config.ts', 'serverExternalPackages', 'External packages configured');
checkFile('tsconfig.json', 'TypeScript configuration');

// Database Configuration
console.log('\n🗄️ Database Configuration:');
checkFile('prisma/schema.prisma', 'Prisma schema');
checkContent('package.json', '@prisma/client', 'Prisma client installed');
checkContent('package.json', 'prisma', 'Prisma CLI installed');

// Final Summary
console.log('\n📊 Validation Summary:');
console.log('======================');

if (allChecksPassed) {
  console.log('🎉 ALL CHECKS PASSED!');
  console.log('\n✅ Your app is ready for Railway deployment with Clerk authentication!');
  console.log('\n📋 Next Steps:');
  console.log('1. Get real Clerk keys from clerk.com');
  console.log('2. Update .env.local with real keys');
  console.log('3. Test locally: npm run dev');
  console.log('4. Deploy to Railway: node deploy-to-railway.js');
  console.log('5. Configure Clerk production instance');
  console.log('6. Test authentication flow in production');
} else {
  console.log('❌ SOME CHECKS FAILED');
  console.log('\n🔧 Please fix the issues above before deploying');
  console.log('\n📖 See CLERK_SETUP_INSTRUCTIONS.md for detailed setup instructions');
}

console.log('\n📚 Documentation:');
console.log('- CLERK_SETUP_INSTRUCTIONS.md - Step-by-step setup guide');
console.log('- RAILWAY_CLERK_DEPLOYMENT.md - Railway deployment guide');
console.log('- test-clerk-auth.js - Authentication testing script');
console.log('- deploy-to-railway.js - Automated deployment script');

console.log('\n🚀 Ready to deploy! Good luck! 🎉');
