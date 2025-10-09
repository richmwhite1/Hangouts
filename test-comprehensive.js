#!/usr/bin/env node

/**
 * Comprehensive App Test Script
 * Tests all functionality before Git push
 */

const { execSync } = require('child_process');

console.log('🧪 Comprehensive App Test');
console.log('========================\n');

let allTestsPassed = true;

function runTest(testName, testFunction) {
  try {
    console.log(`Testing ${testName}...`);
    const result = testFunction();
    if (result) {
      console.log(`✅ ${testName} - PASSED`);
    } else {
      console.log(`❌ ${testName} - FAILED`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${testName} - ERROR: ${error.message}`);
    allTestsPassed = false;
  }
}

// Test 1: Server is running
runTest('Server Status', () => {
  const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', { encoding: 'utf8' });
  return response.trim() === '200';
});

// Test 2: All main pages respond correctly
runTest('Main Pages', () => {
  const pages = ['/', '/login', '/signup', '/create', '/discover', '/friends', '/messages', '/profile'];
  for (const page of pages) {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000${page}`, { encoding: 'utf8' });
    if (response.trim() !== '200') {
      console.log(`  ❌ ${page} returned ${response.trim()}`);
      return false;
    }
  }
  return true;
});

// Test 3: API endpoints work
runTest('API Endpoints', () => {
  const apis = ['/api/events', '/api/health'];
  for (const api of apis) {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000${api}`, { encoding: 'utf8' });
    if (response.trim() !== '200') {
      console.log(`  ❌ ${api} returned ${response.trim()}`);
      return false;
    }
  }
  return true;
});

// Test 4: Clerk integration
runTest('Clerk Integration', () => {
  const html = execSync('curl -s http://localhost:3000', { encoding: 'utf8' });
  return html.includes('pk_test_Z2FtZS1wYW5nb2xpbi03Mi5jbGVyay5hY2NvdW50cy5kZXYk') && 
         html.includes('ClerkProvider');
});

// Test 5: Events API returns data
runTest('Events Data', () => {
  const response = execSync('curl -s http://localhost:3000/api/events', { encoding: 'utf8' });
  const data = JSON.parse(response);
  return data.success === true && Array.isArray(data.events);
});

// Test 6: Authentication pages load correctly
runTest('Auth Pages', () => {
  const loginHtml = execSync('curl -s http://localhost:3000/login', { encoding: 'utf8' });
  const signupHtml = execSync('curl -s http://localhost:3000/signup', { encoding: 'utf8' });
  return loginHtml.includes('Welcome to Hangout') && signupHtml.includes('Welcome to Hangout');
});

// Test 7: No console errors in main pages
runTest('No Critical Errors', () => {
  const pages = ['/', '/discover', '/create'];
  for (const page of pages) {
    const html = execSync(`curl -s http://localhost:3000${page}`, { encoding: 'utf8' });
    if (html.includes('500') || html.includes('Internal Server Error')) {
      console.log(`  ❌ ${page} has server errors`);
      return false;
    }
  }
  return true;
});

console.log('\n' + '='.repeat(50));

if (allTestsPassed) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('\n✅ App is ready for deployment:');
  console.log('   - All pages load correctly (200 status)');
  console.log('   - Clerk authentication is properly integrated');
  console.log('   - API endpoints are working');
  console.log('   - Events data is loading');
  console.log('   - No critical errors detected');
  
  console.log('\n🚀 Ready to push to Git and deploy to Railway!');
  console.log('\nNext steps:');
  console.log('   1. git add .');
  console.log('   2. git commit -m "Fix Clerk middleware and complete authentication setup"');
  console.log('   3. git push origin main');
  console.log('   4. Deploy to Railway');
  
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('\n🔧 Please fix the issues above before deploying.');
  process.exit(1);
}
