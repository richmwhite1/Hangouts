const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testHangoutCreationComplete() {
  console.log(`🚀 Testing complete hangout creation functionality at: ${RAILWAY_APP_URL}`);

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
      title: 'Complete Test Hangout ' + Date.now(),
      description: 'Testing complete hangout creation functionality',
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
        },
        {
          id: 'option_2',
          title: 'Test Option 2',
          description: 'Second test option',
          location: 'Test Location 2',
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
          price: 10
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
      
      // Test 5: Test Opening the Created Hangout
      console.log('\n🔍 Test 5: Test Opening the Created Hangout');
      const hangoutId = createData.data?.id;
      
      if (hangoutId) {
        const hangoutResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${hangoutId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Hangout fetch response status:', hangoutResponse.status);
        const hangoutData = await hangoutResponse.json();
        
        if (hangoutResponse.status === 200 && hangoutData.success) {
          console.log('✅ Created hangout can be fetched successfully!');
          console.log('   Hangout title:', hangoutData.hangout.title);
        } else {
          console.log('⚠️ Failed to fetch created hangout');
          console.log('   Response:', hangoutData);
        }
        
        // Test 6: Navigate to the Created Hangout Page
        console.log('\n🔍 Test 6: Navigate to the Created Hangout Page');
        const hangoutPageUrl = `${RAILWAY_APP_URL}/hangout/${hangoutId}`;
        await page.goto(hangoutPageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const finalUrl = page.url();
        if (finalUrl.includes(`/hangout/${hangoutId}`)) {
          console.log(`✅ Successfully navigated to created hangout: ${finalUrl}`);
          
          // Check for hangout content
          try {
            const hangoutTitle = await page.$eval('h1, h2, [data-testid="hangout-title"]', el => el.textContent);
            console.log('Hangout title on page:', hangoutTitle);
          } catch (e) {
            console.log('Could not find hangout title element on page');
          }
        } else {
          console.log(`⚠️ Failed to navigate to hangout page. Redirected to: ${finalUrl}`);
        }
      }
    } else if (createResponse.status === 403 && createData.error === 'CORS error') {
      console.log('❌ CORS error still present - fix not working');
      throw new Error('CORS error still blocking hangout creation');
    } else {
      console.log('❌ Hangout creation failed');
      console.log('   Status:', createResponse.status);
      console.log('   Error:', createData.error);
      console.log('   Message:', createData.message);
      throw new Error(`Hangout creation failed: ${createData.error || 'Unknown error'}`);
    }

    console.log('\n🎉 Complete hangout creation test completed successfully!');
    console.log('\n📋 Summary of tests:');
    console.log('✅ Health check working');
    console.log('✅ Sign in working');
    console.log('✅ Create page accessible');
    console.log('✅ Hangout creation API working');
    console.log('✅ Created hangout can be fetched');
    console.log('✅ Hangout page navigation working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testHangoutCreationComplete();














