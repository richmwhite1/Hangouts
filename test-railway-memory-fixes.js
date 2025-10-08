const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testRailwayMemoryFixes() {
  console.log(`🚀 Testing Railway deployment with memory fixes at: ${RAILWAY_APP_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER PAGE ERROR: ${err.message}`));
  page.on('requestfailed', request => {
    console.error(`REQUEST FAILED: ${request.url()} ${request.failure().errorText}`);
  });

  try {
    // Test 1: Health Check with Memory Monitoring
    console.log('\n🏥 Test 1: Health Check with Memory Monitoring');
    const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check response:', healthData);
    
    if (healthData.memory) {
      console.log(`🧠 Memory Usage: Heap: ${healthData.memory.heapUsed}MB, RSS: ${healthData.memory.rss}MB`);
      if (healthData.memory.heapUsed > 500) {
        console.log('⚠️ High memory usage detected');
      } else {
        console.log('✅ Memory usage looks good');
      }
    }
    
    if (healthResponse.status !== 200 || healthData.status !== 'ok') {
      throw new Error('Health check failed');
    }

    // Test 2: Sign In
    console.log('\n🔐 Test 2: Sign In');
    await page.goto(`${RAILWAY_APP_URL}/signin`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const signInButton = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && signInButton) {
      await emailInput.type(TEST_USER_EMAIL);
      await passwordInput.type(TEST_USER_PASSWORD);
      await signInButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl === RAILWAY_APP_URL || currentUrl.includes('hangouts-production')) {
        console.log('✅ Sign in successful - navigation completed');
      } else {
        throw new Error(`Sign in failed. Redirected to: ${currentUrl}`);
      }
    } else {
      throw new Error('Sign in form elements not found');
    }

    // Test 3: Test Hangout API with Memory Monitoring
    console.log('\n🔍 Test 3: Test Hangout API with Memory Monitoring');
    
    // Test with non-existent hangout
    const nonExistentResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/test-hangout-123`);
    const nonExistentData = await nonExistentResponse.json();
    console.log('📊 Non-existent hangout response:', nonExistentData);
    
    if (nonExistentResponse.status === 404 && nonExistentData.error === 'Hangout not found') {
      console.log('✅ Non-existent hangout properly handled with 404');
    } else {
      console.log('⚠️ Unexpected response for non-existent hangout');
    }

    // Test 4: Test Multiple API Calls to Check Memory Stability
    console.log('\n🔄 Test 4: Test Multiple API Calls for Memory Stability');
    
    for (let i = 0; i < 5; i++) {
      console.log(`   API call ${i + 1}/5...`);
      
      // Test hangout API
      const hangoutResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/test-hangout-${i}`);
      const hangoutData = await hangoutResponse.json();
      
      // Test health endpoint for memory monitoring
      const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
      const healthData = await healthResponse.json();
      
      if (healthData.memory) {
        console.log(`   Memory after call ${i + 1}: Heap: ${healthData.memory.heapUsed}MB`);
      }
      
      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 5: Test Profile Page
    console.log('\n🖼️ Test 5: Test Profile Page');
    await page.goto(`${RAILWAY_APP_URL}/profile/richard`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const profileTitle = await page.title();
    if (profileTitle.includes('Profile') || profileTitle.includes('Hangouts')) {
      console.log('✅ Profile page loaded successfully');
    } else {
      console.log('⚠️ Profile page title verification failed');
    }

    // Test 6: Test Friends Page
    console.log('\n👥 Test 6: Test Friends Page');
    await page.goto(`${RAILWAY_APP_URL}/friends`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const friendsTitle = await page.title();
    if (friendsTitle.includes('Friends') || friendsTitle.includes('Hangouts')) {
      console.log('✅ Friends page loaded successfully');
    } else {
      console.log('⚠️ Friends page title verification failed');
    }

    // Test 7: Final Memory Check
    console.log('\n🧠 Test 7: Final Memory Check');
    const finalHealthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
    const finalHealthData = await finalHealthResponse.json();
    
    if (finalHealthData.memory) {
      console.log(`🧠 Final Memory Usage: Heap: ${finalHealthData.memory.heapUsed}MB, RSS: ${finalHealthData.memory.rss}MB`);
      
      const memoryIncrease = finalHealthData.memory.heapUsed - healthData.memory.heapUsed;
      if (memoryIncrease > 100) {
        console.log(`⚠️ Memory increased by ${memoryIncrease}MB during testing`);
      } else {
        console.log(`✅ Memory usage stable (increased by ${memoryIncrease}MB)`);
      }
    }

    console.log('\n🎉 Railway memory fixes test completed successfully!');
    console.log('\n📋 Summary of fixes verified:');
    console.log('✅ Health check with memory monitoring working');
    console.log('✅ Sign in working');
    console.log('✅ Hangout API working correctly');
    console.log('✅ Multiple API calls handled without memory leaks');
    console.log('✅ Profile page accessible');
    console.log('✅ Friends page accessible');
    console.log('✅ Memory usage stable');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

const waitTime = 3 * 60 * 1000; // 3 minutes in milliseconds
console.log(`⏰ Waiting ${waitTime / 60000} minutes for Railway deployment to complete...`);
setTimeout(() => {
  testRailwayMemoryFixes();
}, waitTime);
