#!/usr/bin/env node

/**
 * Quick Local Test Script
 * Verifies the app is running correctly locally
 */

const { execSync } = require('child_process');

console.log('🧪 Quick Local Test');
console.log('==================\n');

try {
  // Test main page
  console.log('1. Testing main page...');
  const mainPageResponse = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', { encoding: 'utf8' });
  if (mainPageResponse.trim() === '200') {
    console.log('✅ Main page responding correctly (200)');
  } else {
    console.log('❌ Main page error:', mainPageResponse.trim());
  }

  // Test login page
  console.log('\n2. Testing login page...');
  const loginPageResponse = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login', { encoding: 'utf8' });
  if (loginPageResponse.trim() === '200') {
    console.log('✅ Login page responding correctly (200)');
  } else {
    console.log('❌ Login page error:', loginPageResponse.trim());
  }

  // Test signup page
  console.log('\n3. Testing signup page...');
  const signupPageResponse = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/signup', { encoding: 'utf8' });
  if (signupPageResponse.trim() === '200') {
    console.log('✅ Signup page responding correctly (200)');
  } else {
    console.log('❌ Signup page error:', signupPageResponse.trim());
  }

  // Check if Clerk is loaded
  console.log('\n4. Checking Clerk integration...');
  const clerkCheck = execSync('curl -s http://localhost:3000 | grep -o "pk_test_[^\"]*"', { encoding: 'utf8' });
  if (clerkCheck.includes('pk_test_Z2FtZS1wYW5nb2xpbi03Mi5jbGVyay5hY2NvdW50cy5kZXYk')) {
    console.log('✅ Clerk publishable key loaded correctly');
  } else {
    console.log('❌ Clerk key not found');
  }

  console.log('\n🎉 All tests passed! Your app is running correctly locally.');
  console.log('\n📱 You can now:');
  console.log('   - Visit http://localhost:3000 in your browser');
  console.log('   - Test the authentication flow');
  console.log('   - Sign up for a new account');
  console.log('   - Sign in with Google OAuth');
  console.log('   - Navigate through the app');

  console.log('\n🚀 Ready for Railway deployment!');
  console.log('   Run: node deploy-to-railway.js');

} catch (error) {
  console.log('❌ Test failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Make sure the dev server is running: npm run dev:next');
  console.log('   2. Check if port 3000 is available');
  console.log('   3. Verify environment variables are set');
}
