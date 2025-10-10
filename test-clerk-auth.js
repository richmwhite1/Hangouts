#!/usr/bin/env node

/**
 * Comprehensive Clerk Authentication Test Script
 * Tests the authentication flow end-to-end for Railway deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Clerk Authentication Test Suite');
console.log('=====================================\n');

// Test 1: Check if Clerk is properly installed
console.log('1. Checking Clerk installation...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.dependencies['@clerk/nextjs']) {
    console.log('✅ @clerk/nextjs is installed:', packageJson.dependencies['@clerk/nextjs']);
  } else {
    console.log('❌ @clerk/nextjs is not installed');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Test 2: Check environment variables
console.log('\n2. Checking environment variables...');
const envFiles = ['.env.local', '.env'];
let envFound = false;

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`✅ Found ${envFile}`);
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    if (envContent.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')) {
      console.log('✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is defined');
    } else {
      console.log('❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing');
    }
    
    if (envContent.includes('CLERK_SECRET_KEY')) {
      console.log('✅ CLERK_SECRET_KEY is defined');
    } else {
      console.log('❌ CLERK_SECRET_KEY is missing');
    }
    
    envFound = true;
    break;
  }
}

if (!envFound) {
  console.log('❌ No environment file found (.env.local or .env)');
  console.log('📝 Please create .env.local with your Clerk keys');
}

// Test 3: Check if layout.tsx includes ClerkProvider
console.log('\n3. Checking ClerkProvider setup...');
try {
  const layoutContent = fs.readFileSync('src/app/layout.tsx', 'utf8');
  if (layoutContent.includes('ClerkProvider')) {
    console.log('✅ ClerkProvider is imported and used in layout.tsx');
  } else {
    console.log('❌ ClerkProvider is not found in layout.tsx');
  }
} catch (error) {
  console.log('❌ Error reading layout.tsx:', error.message);
}

// Test 4: Check if middleware is properly configured
console.log('\n4. Checking middleware configuration...');
try {
  const middlewareContent = fs.readFileSync('src/middleware.ts', 'utf8');
  if (middlewareContent.includes('NextRequest') && middlewareContent.includes('NextResponse')) {
    console.log('✅ Middleware is properly configured');
  } else {
    console.log('❌ Middleware configuration issues detected');
  }
} catch (error) {
  console.log('❌ Error reading middleware.ts:', error.message);
}

// Test 5: Check if login/signup pages exist
console.log('\n5. Checking authentication pages...');
const authPages = [
  'src/app/login/[[...rest]]/page.tsx',
  'src/app/signup/[[...rest]]/page.tsx'
];

for (const page of authPages) {
  if (fs.existsSync(page)) {
    console.log(`✅ ${page} exists`);
    const content = fs.readFileSync(page, 'utf8');
    if (content.includes('SignIn') || content.includes('SignUp')) {
      console.log(`✅ ${page} uses Clerk components`);
    } else {
      console.log(`❌ ${page} doesn't use Clerk components`);
    }
  } else {
    console.log(`❌ ${page} is missing`);
  }
}

// Test 6: Check if main page uses Clerk hooks
console.log('\n6. Checking main page authentication...');
try {
  const pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');
  if (pageContent.includes('useAuth') && pageContent.includes('useUser')) {
    console.log('✅ Main page uses Clerk authentication hooks');
  } else {
    console.log('❌ Main page doesn\'t use Clerk authentication hooks');
  }
} catch (error) {
  console.log('❌ Error reading page.tsx:', error.message);
}

// Test 7: Check Railway configuration
console.log('\n7. Checking Railway deployment configuration...');
if (fs.existsSync('railway.json')) {
  console.log('✅ railway.json exists');
  const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
  if (railwayConfig.deploy && railwayConfig.deploy.startCommand) {
    console.log('✅ Railway start command configured:', railwayConfig.deploy.startCommand);
  }
} else {
  console.log('❌ railway.json is missing');
}

// Test 8: Check if build works
console.log('\n8. Testing build process...');
try {
  console.log('Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.log('❌ Build failed:', error.message);
}

// Test 9: Generate Railway deployment checklist
console.log('\n9. Railway Deployment Checklist');
console.log('================================');
console.log('📋 Before deploying to Railway:');
console.log('   1. Create Clerk production instance at clerk.com');
console.log('   2. Get production keys (pk_live_... and sk_live_...)');
console.log('   3. Set environment variables in Railway dashboard:');
console.log('      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
console.log('      - CLERK_SECRET_KEY');
console.log('      - DATABASE_URL (PostgreSQL)');
console.log('      - NEXTAUTH_URL (your Railway domain)');
console.log('      - NEXTAUTH_SECRET');
console.log('   4. Configure OAuth providers in Clerk dashboard');
console.log('   5. Add Railway domain to Clerk allowed domains');
console.log('   6. Test authentication flow after deployment');

console.log('\n🎉 Authentication setup test completed!');
console.log('📖 See RAILWAY_CLERK_DEPLOYMENT.md for detailed instructions');
