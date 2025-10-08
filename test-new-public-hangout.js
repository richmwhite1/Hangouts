const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testNewPublicHangout() {
  console.log(`🚀 Testing new public hangout at: ${RAILWAY_APP_URL}`);

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
    // Test 1: Sign In
    console.log('\n🔐 Test 1: Sign In');
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
      console.log('✅ Sign in successful');
    }

    // Test 2: Create a New Public Hangout
    console.log('\n🏠 Test 2: Create a New Public Hangout');
    
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
    
    const hangoutData = {
      title: 'New Public Test ' + Date.now(),
      description: 'Testing public access with a fresh hangout',
      location: 'Test Location',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      options: [
        {
          id: 'option_1',
          title: 'Option 1: Coffee',
          description: 'Let\'s get coffee',
          location: 'Coffee Shop',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 5
        }
      ],
      participants: []
    };

    console.log('Creating new public hangout...');
    const createResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(hangoutData)
    });

    const createData = await createResponse.json();
    console.log('Create response status:', createResponse.status);
    console.log('Create response data:', createData);

    if (createResponse.status !== 200 && createResponse.status !== 201) {
      throw new Error(`Hangout creation failed: ${createData.error || 'Unknown error'}`);
    }

    const hangoutId = createData.data?.id;
    if (!hangoutId) {
      throw new Error('No hangout ID returned from creation');
    }

    console.log('✅ New public hangout created!');
    console.log('   Hangout ID:', hangoutId);

    // Test 3: Test Public Access (without authentication)
    console.log('\n🌐 Test 3: Test Public Access (without authentication)');
    
    // Clear authentication to simulate non-authenticated user
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('token');
    });
    
    const publicHangoutUrl = `${RAILWAY_APP_URL}/hangout/${hangoutId}`;
    console.log('Accessing public hangout URL:', publicHangoutUrl);
    
    await page.goto(publicHangoutUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer for data to load

    const currentUrl = page.url();
    console.log('Page URL after clearing auth:', currentUrl);
    
    // Check page title
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check for any text content
    const allText = await page.evaluate(() => document.body.textContent);
    console.log('Page content preview:', allText.substring(0, 1000));
    
    // Check for specific elements
    const h1Elements = await page.$$('h1');
    const h1Texts = await Promise.all(h1Elements.map(el => el.evaluate(e => e.textContent)));
    console.log('H1 elements:', h1Texts);
    
    const h2Elements = await page.$$('h2');
    const h2Texts = await Promise.all(h2Elements.map(el => el.evaluate(e => e.textContent)));
    console.log('H2 elements:', h2Texts);
    
    // Check for buttons
    const buttons = await page.$$('button');
    const buttonTexts = await Promise.all(buttons.map(btn => btn.evaluate(el => el.textContent)));
    console.log('Button texts:', buttonTexts.filter(text => text && text.length > 0));
    
    // Check for loading indicators
    const loadingElements = await page.$$('[class*="loading"], [class*="Loading"], .animate-spin');
    console.log('Loading elements found:', loadingElements.length);
    
    // Check for error messages
    const errorElements = await page.$$('[class*="error"], [class*="Error"]');
    const errorTexts = await Promise.all(errorElements.map(el => el.evaluate(e => e.textContent)));
    console.log('Error elements found:', errorTexts.filter(text => text && text.length > 0));

    console.log('\n🎉 New public hangout test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testNewPublicHangout();
