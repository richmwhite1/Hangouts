#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🚀 Complete Clerk Setup for Hangout App');
console.log('========================================\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder_replace_with_real_key
CLERK_SECRET_KEY=sk_test_placeholder_replace_with_real_key

# Existing environment variables
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file\n');
} else {
  console.log('✅ .env.local file already exists\n');
}

console.log('🔐 STEP 1: Get Your Clerk Keys');
console.log('==============================');
console.log('1. Go to: https://clerk.com');
console.log('2. Click "Sign up" (free account)');
console.log('3. Create new application:');
console.log('   - Name: "Hangout App"');
console.log('   - Choose "Next.js" as framework');
console.log('4. In the dashboard:');
console.log('   - Go to "API Keys" section');
console.log('   - Copy your "Publishable key" (starts with pk_test_)');
console.log('   - Copy your "Secret key" (starts with sk_test_)');
console.log('5. Go to "Authentication" → "Social connections"');
console.log('   - Click "Add connection"');
console.log('   - Select "Google"');
console.log('   - Follow the setup instructions\n');

console.log('🔧 STEP 2: Update Your Environment');
console.log('==================================');
console.log('Replace the placeholder values in .env.local with your real keys:');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here');
console.log('CLERK_SECRET_KEY=sk_test_your_actual_key_here\n');

console.log('🚀 STEP 3: Test the Application');
console.log('===============================');
console.log('Once you have updated .env.local with your real keys:');
console.log('1. Run: npm run dev');
console.log('2. Visit: http://localhost:3000');
console.log('3. You should see the login page');
console.log('4. Click "Continue with Google" to test authentication\n');

console.log('📱 What You\'ll See:');
console.log('===================');
console.log('✅ Beautiful dark-themed login page');
console.log('✅ Google OAuth sign-in button');
console.log('✅ Automatic redirects for unauthenticated users');
console.log('✅ User profile menu in navigation');
console.log('✅ Seamless integration with your existing app\n');

console.log('🔗 For Railway Deployment:');
console.log('=========================');
console.log('Add these environment variables to your Railway project:');
console.log('- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
console.log('- CLERK_SECRET_KEY\n');

console.log('🎉 Ready to test! Update your .env.local file and run: npm run dev');
