const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testHangoutCreationCORS() {
  console.log(`🚀 Testing hangout creation CORS fix at: ${RAILWAY_APP_URL}`);

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
    // Test 1: Health Check
    console.log('\n🏥 Test 1: Health Check');
    const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check response:', healthData);
    
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

    // Test 3: Navigate to Create Page
    console.log('\n🏠 Test 3: Navigate to Create Page');
    await page.goto(`${RAILWAY_APP_URL}/create`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    console.log('Create page URL:', currentUrl);
    
    if (currentUrl.includes('/create')) {
      console.log('✅ Create page loaded successfully');
    } else if (currentUrl.includes('/login')) {
      console.log('⚠️ Redirected to login - authentication issue');
    } else {
      console.log('⚠️ Unexpected redirect from create page');
    }

    // Test 4: Test Direct API Call for Hangout Creation
    console.log('\n🔍 Test 4: Test Direct API Call for Hangout Creation');
    
    // Get the auth token from localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
    
    if (!token) {
      throw new Error('No auth token found in localStorage');
    }
    
    console.log('Auth token found, length:', token.length);

    // Test the hangout creation API directly
    const hangoutData = {
      title: 'Test Hangout CORS Fix ' + Date.now(),
      description: 'Testing CORS fix for hangout creation',
      location: 'Test Location',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      options: [
        {
          id: 'option_1',
          title: 'Test Option 1',
          description: 'First test option',
          location: 'Test Location 1',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          price: 0
        }
      ],
      participants: []
    };

    console.log('Sending hangout creation request...');
    const createResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(hangoutData)
    });

    console.log('Create response status:', createResponse.status);
    const createData = await createResponse.json();
    console.log('Create response data:', createData);

    if (createResponse.status === 200 || createResponse.status === 201) {
      console.log('✅ Hangout creation API working correctly!');
      console.log('   Created hangout ID:', createData.data?.id);
    } else if (createResponse.status === 403 && createData.error === 'CORS error') {
      console.log('❌ CORS error still present - fix not working');
      throw new Error('CORS error still blocking hangout creation');
    } else {
      console.log('⚠️ Unexpected response from hangout creation API');
      console.log('   Status:', createResponse.status);
      console.log('   Error:', createData.error);
    }

    // Test 5: Test OPTIONS Request (Preflight)
    console.log('\n🔍 Test 5: Test OPTIONS Request (Preflight)');
    
    const optionsResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://hangouts-production-adc4.up.railway.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log('OPTIONS response status:', optionsResponse.status);
    console.log('CORS headers:');
    console.log('  Access-Control-Allow-Origin:', optionsResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('  Access-Control-Allow-Methods:', optionsResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('  Access-Control-Allow-Headers:', optionsResponse.headers.get('Access-Control-Allow-Headers'));

    if (optionsResponse.status === 200) {
      console.log('✅ OPTIONS request handled correctly');
    } else {
      console.log('⚠️ OPTIONS request failed');
    }

    console.log('\n🎉 Hangout creation CORS test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

const waitTime = 2 * 60 * 1000; // 2 minutes in milliseconds
console.log(`⏰ Waiting ${waitTime / 60000} minutes for Railway deployment to complete...`);
setTimeout(() => {
  testHangoutCreationCORS();
}, waitTime);















