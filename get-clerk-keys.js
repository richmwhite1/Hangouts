#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔐 Quick Clerk Setup - Get Your Keys in 2 Minutes!');
console.log('==================================================\n');

console.log('📋 STEP 1: Create Clerk Account');
console.log('===============================');
console.log('1. Go to: https://clerk.com');
console.log('2. Click "Sign up" (it\'s free!)');
console.log('3. Use your email or Google account\n');

console.log('🏗️ STEP 2: Create Application');
console.log('=============================');
console.log('1. Click "Create application"');
console.log('2. Name: "Hangout App"');
console.log('3. Framework: "Next.js"');
console.log('4. Click "Create application"\n');

console.log('🔑 STEP 3: Get Your Keys');
console.log('========================');
console.log('1. In the dashboard, go to "API Keys"');
console.log('2. Copy the "Publishable key" (starts with pk_test_)');
console.log('3. Copy the "Secret key" (starts with sk_test_)');
console.log('4. Keep this window open - you\'ll need these keys!\n');

console.log('🔧 STEP 4: Update Environment File');
console.log('==================================');
console.log('I\'ll help you update the .env.local file once you have the keys.\n');

console.log('🚀 STEP 5: Test the App');
console.log('======================');
console.log('Once you update the keys, the app will work perfectly!\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file found');
  console.log('📝 Current content:');
  console.log('==================');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log(content);
  console.log('\n🔧 Replace the placeholder values with your real Clerk keys!');
} else {
  console.log('📝 Creating .env.local file...');
  const envContent = `# Clerk Authentication - Replace with your real keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder_replace_with_real_key
CLERK_SECRET_KEY=sk_test_placeholder_replace_with_real_key

# Existing environment variables
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
}

console.log('\n🎯 Ready to get your keys?');
console.log('==========================');
console.log('1. Open https://clerk.com in a new tab');
console.log('2. Follow the steps above');
console.log('3. Come back here when you have your keys');
console.log('4. I\'ll help you update the .env.local file\n');

console.log('💡 Pro Tip: The whole process takes less than 2 minutes!');
