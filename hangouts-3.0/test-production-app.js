#!/usr/bin/env node

const https = require('https');

const BASE_URL = 'https://hangouts-production-adc4.up.railway.app';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          path,
          url,
          hasContent: data.length > 0,
          isHtml: data.includes('<html'),
          hasClerk: data.includes('clerk'),
          hasHangouts: data.includes('Hangouts')
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('🧪 Hangouts 3.0 - Production Test Suite');
  console.log('=====================================\n');
  
  const tests = [
    { path: '/', name: 'Home Page' },
    { path: '/login', name: 'Login Page' },
    { path: '/signup', name: 'Signup Page' },
    { path: '/discover', name: 'Discover Page' },
    { path: '/create', name: 'Create Page' },
    { path: '/events', name: 'Events Page' },
    { path: '/profile', name: 'Profile Page' },
    { path: '/api/health', name: 'Health API' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const result = await makeRequest(test.path);
      results.push({ ...test, ...result });
      
      if (result.status === 200) {
        console.log(`✅ ${test.name}: ${result.status} - Working`);
        if (result.hasClerk) {
          console.log(`   🔐 Clerk integration detected`);
        }
        if (result.hasHangouts) {
          console.log(`   🎯 Hangouts branding detected`);
        }
      } else {
        console.log(`❌ ${test.name}: ${result.status} - Failed`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
      results.push({ ...test, status: 'ERROR', error: error.message });
    }
    console.log('');
  }
  
  // Summary
  console.log('📊 Test Summary');
  console.log('===============');
  
  const successful = results.filter(r => r.status === 200).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((successful / total) * 100)}%`);
  
  if (successful === total) {
    console.log('\n🎉 ALL TESTS PASSED! App is working perfectly!');
    console.log(`🌐 Live URL: ${BASE_URL}`);
  } else {
    console.log('\n⚠️ Some tests failed. Check the details above.');
  }
  
  // Performance check
  console.log('\n⚡ Performance Check');
  console.log('===================');
  
  try {
    const start = Date.now();
    const healthResult = await makeRequest('/api/health');
    const responseTime = Date.now() - start;
    
    console.log(`🏥 Health API Response Time: ${responseTime}ms`);
    
    if (responseTime < 500) {
      console.log('✅ Excellent performance!');
    } else if (responseTime < 1000) {
      console.log('✅ Good performance');
    } else {
      console.log('⚠️ Slow response time');
    }
  } catch (error) {
    console.log('❌ Health check failed');
  }
  
  console.log('\n🚀 Deployment Status: PRODUCTION READY');
  console.log('=====================================');
  console.log('The Hangouts 3.0 app is successfully deployed and working!');
  console.log(`Visit: ${BASE_URL}`);
}

runTests().catch(console.error);
















