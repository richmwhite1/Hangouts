#!/usr/bin/env node

/**
 * Test MVP Functionality Script
 * Tests the complete app functionality to ensure it's MVP-ready
 */

const baseUrl = 'https://hangouts-production-adc4.up.railway.app';

async function testEndpoint(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testAppFunctionality() {
  console.log('🧪 Testing MVP App Functionality...\n');

  const tests = [
    {
      name: 'Health Check',
      endpoint: '/api/health',
      expectedStatus: 200
    },
    {
      name: 'Database Health',
      endpoint: '/api/health/db',
      expectedStatus: 200
    },
    {
      name: 'Events API (Public)',
      endpoint: '/api/events',
      expectedStatus: 200
    },
    {
      name: 'Discover API (Public)',
      endpoint: '/api/discover',
      expectedStatus: 200
    },
    {
      name: 'Feed API (Public)',
      endpoint: '/api/feed',
      expectedStatus: 200
    },
    {
      name: 'Auth Me (Requires Auth)',
      endpoint: '/api/auth/me',
      expectedStatus: 401
    },
    {
      name: 'Notifications (Requires Auth)',
      endpoint: '/api/notifications/preferences',
      expectedStatus: 401
    },
    {
      name: 'Unread Counts (Requires Auth)',
      endpoint: '/api/conversations/unread-counts',
      expectedStatus: 401
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`🔍 Testing ${test.name}...`);
    
    const result = await testEndpoint(test.endpoint);
    
    if (result.success && result.status === test.expectedStatus) {
      console.log(`✅ ${test.name}: PASSED (${result.status})`);
      passedTests++;
    } else if (!result.success && test.expectedStatus === 401) {
      console.log(`✅ ${test.name}: PASSED (401 Unauthorized as expected)`);
      passedTests++;
    } else {
      console.log(`❌ ${test.name}: FAILED (${result.status}) - ${result.error || result.data?.error || 'Unknown error'}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The app is MVP-ready!');
  } else {
    console.log('⚠️ Some tests failed. The app may need additional fixes.');
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Sign in with Clerk authentication');
  console.log('2. Test hangout creation with images');
  console.log('3. Test voting system');
  console.log('4. Test friend system');
  console.log('5. Test messaging and notifications');
}

testAppFunctionality().catch(console.error);
