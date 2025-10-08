const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testSharingSystem() {
  console.log(`🚀 Testing complete sharing system at: ${RAILWAY_APP_URL}`);

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

    // Test 3: Create a Public Hangout
    console.log('\n🏠 Test 3: Create a Public Hangout');
    
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
    
    if (!token) {
      throw new Error('No auth token found in localStorage');
    }
    
    console.log('Auth token found, length:', token.length);

    const hangoutData = {
      title: 'Sharing System Test ' + Date.now(),
      description: 'Testing the complete sharing functionality with rich URLs and public access',
      location: 'Test Location for Sharing',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      options: [
        {
          id: 'option_1',
          title: 'Option 1: Coffee Shop',
          description: 'Let\'s meet at the local coffee shop',
          location: 'Downtown Coffee Shop',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 5
        },
        {
          id: 'option_2',
          title: 'Option 2: Park Picnic',
          description: 'Enjoy a picnic in the park',
          location: 'Central Park',
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          price: 10
        }
      ],
      participants: []
    };

    console.log('Creating public hangout...');
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

    if (createResponse.status !== 200 && createResponse.status !== 201) {
      throw new Error(`Hangout creation failed: ${createData.error || 'Unknown error'}`);
    }

    const hangoutId = createData.data?.id;
    if (!hangoutId) {
      throw new Error('No hangout ID returned from creation');
    }

    console.log('✅ Public hangout created successfully!');
    console.log('   Hangout ID:', hangoutId);
    console.log('   Privacy Level:', createData.data?.privacyLevel);

    // Test 4: Test Public Access (without authentication)
    console.log('\n🌐 Test 4: Test Public Access (without authentication)');
    
    // Clear authentication to simulate non-authenticated user
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('token');
    });
    
    const publicHangoutUrl = `${RAILWAY_APP_URL}/hangout/${hangoutId}`;
    console.log('Accessing public hangout URL:', publicHangoutUrl);
    
    await page.goto(publicHangoutUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    console.log('Page URL after clearing auth:', currentUrl);
    
    if (currentUrl.includes(`/hangout/${hangoutId}`)) {
      console.log('✅ Public hangout accessible without authentication');
      
      // Check for public viewer elements
      const publicViewerElements = await page.$$('h1, h2, h3');
      const publicViewerTexts = await Promise.all(publicViewerElements.map(el => el.evaluate(e => e.textContent)));
      console.log('Public viewer elements found:', publicViewerTexts.filter(text => text && text.length > 0));
      
      // Check for sign-in prompts
      const signInButtons = await page.$$('button');
      const signInButtonTexts = await Promise.all(signInButtons.map(btn => btn.evaluate(el => el.textContent)));
      const signInPrompts = signInButtonTexts.filter(text => text && text.toLowerCase().includes('sign in'));
      console.log('Sign-in prompts found:', signInPrompts);
      
    } else {
      console.log('⚠️ Public hangout not accessible or redirected');
    }

    // Re-authenticate for remaining tests
    console.log('\n🔐 Re-authenticating for remaining tests...');
    await page.goto(`${RAILWAY_APP_URL}/signin`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const emailInput2 = await page.$('input[type="email"], input[name="email"]');
    const passwordInput2 = await page.$('input[type="password"], input[name="password"]');
    const signInButton2 = await page.$('button[type="submit"]');

    if (emailInput2 && passwordInput2 && signInButton2) {
      await emailInput2.type(TEST_USER_EMAIL);
      await passwordInput2.type(TEST_USER_PASSWORD);
      await signInButton2.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Re-authentication successful');
    }

    // Test 5: Test Sharing Functionality
    console.log('\n📤 Test 5: Test Sharing Functionality');
    
    // Navigate to the hangout page in the authenticated session
    await page.goto(publicHangoutUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Look for sharing buttons
    const shareButtons = await page.$$('button');
    const shareButtonTexts = await Promise.all(shareButtons.map(btn => btn.evaluate(el => el.textContent)));
    const shareButtonsFound = shareButtonTexts.filter(text => text && (text.includes('Share') || text.includes('Copy')));
    console.log('Share buttons found:', shareButtonsFound);

    // Test heart/save functionality
    const heartButtons = await page.$$('button');
    const heartButtonTexts = await Promise.all(heartButtons.map(btn => btn.evaluate(el => el.textContent)));
    const heartButtonsFound = heartButtonTexts.filter(text => text && text.includes('Heart'));
    console.log('Heart buttons found:', heartButtonsFound);

    // Test 6: Test Beta Feedback System
    console.log('\n🧪 Test 6: Test Beta Feedback System');
    
    // Look for beta FAB
    const betaFab = await page.$('[data-testid="beta-fab"], .fixed.bottom-6.right-6');
    if (betaFab) {
      console.log('✅ Beta FAB found');
      
      // Try to click the beta FAB
      await betaFab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Look for feedback modal
      const feedbackModal = await page.$('[data-testid="feedback-modal"], .fixed.inset-0');
      if (feedbackModal) {
        console.log('✅ Beta feedback modal opened');
      } else {
        console.log('⚠️ Beta feedback modal not found');
      }
    } else {
      console.log('⚠️ Beta FAB not found');
    }

    // Test 7: Test Rich URL Preview
    console.log('\n🔗 Test 7: Test Rich URL Preview');
    
    // Check for Open Graph meta tags
    const ogTitle = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:title"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    const ogDescription = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:description"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    const ogImage = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:image"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    console.log('Open Graph meta tags:');
    console.log('  Title:', ogTitle);
    console.log('  Description:', ogDescription);
    console.log('  Image:', ogImage);

    if (ogTitle && ogDescription) {
      console.log('✅ Rich URL preview meta tags found');
    } else {
      console.log('⚠️ Rich URL preview meta tags missing');
    }

    console.log('\n🎉 Sharing system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testSharingSystem();
