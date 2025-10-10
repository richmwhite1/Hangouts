const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testProductionComplete() {
  console.log(`🚀 Testing complete production functionality at: ${RAILWAY_APP_URL}`);
  console.log('⏰ Waiting 2 minutes for Railway deployment to complete...');
  
  // Wait for deployment
  await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Listen for console messages and page errors
  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER PAGE ERROR: ${err.message}`));

  try {
    // Test 1: Health Check
    console.log('\n🏥 Test 1: Health Check');
    const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check response:', healthData);
    if (healthResponse.status !== 200 || healthData.status !== 'ok') {
      throw new Error('Health check failed');
    }

    // Test 2: Home Page
    console.log('\n🏠 Test 2: Home Page');
    await page.goto(RAILWAY_APP_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    if (pageTitle.includes('Hangouts') || pageTitle.includes('Hangout')) {
      console.log('✅ Home page loaded successfully');
    } else {
      throw new Error(`Unexpected page title: ${pageTitle}`);
    }

    // Test 3: Sign In
    console.log('\n🔐 Test 3: Sign In');
    await page.goto(`${RAILWAY_APP_URL}/signin`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const signInEmailInput = await page.$('input[type="email"], input[name="email"]');
    const signInPasswordInput = await page.$('input[type="password"], input[name="password"]');
    const signInButton = await page.$('button[type="submit"]');

    if (signInEmailInput && signInPasswordInput && signInButton) {
      await signInEmailInput.type(TEST_USER_EMAIL);
      await signInPasswordInput.type(TEST_USER_PASSWORD);
      await signInButton.click();
      
      // Wait for navigation or error
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('✅ Sign in successful - navigation completed');
      } catch (navError) {
        const currentUrl = page.url();
        if (currentUrl.includes('/signin')) {
          const errorElement = await page.$('[class*="error"], [class*="Error"]');
          if (errorElement) {
            const errorText = await errorElement.evaluate(el => el.textContent);
            throw new Error(`Sign in failed with error: ${errorText}`);
          } else {
            throw new Error('Sign in failed - still on signin page but no error message visible');
          }
        } else {
          console.log('✅ Sign in successful - redirected to:', currentUrl);
        }
      }
    } else {
      throw new Error('Sign in form elements not found');
    }

    // Test 4: Create a New Hangout
    console.log('\n🏠 Test 4: Create a New Hangout');
    await page.goto(`${RAILWAY_APP_URL}/create`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const createPageTitle = await page.title();
    console.log(`📄 Create page title: ${createPageTitle}`);
    
    // Look for hangout creation form elements
    const titleInput = await page.$('input[name="title"], input[placeholder*="title"], input[placeholder*="Title"]');
    const descriptionInput = await page.$('textarea[name="description"], textarea[placeholder*="description"], textarea[placeholder*="Description"]');
    const createButton = await page.$('button[type="submit"], button:has-text("Create"), button:has-text("create")');
    
    if (titleInput && descriptionInput && createButton) {
      console.log('✅ Hangout creation form found');
      
      const hangoutTitle = `Production Test Hangout ${Date.now()}`;
      const hangoutDescription = 'This is a test hangout created by Puppeteer for production testing.';
      
      await titleInput.type(hangoutTitle);
      await descriptionInput.type(hangoutDescription);
      
      console.log('📝 Filled hangout form with test data');
      
      // Click create button
      await createButton.click();
      console.log('🖱️ Clicked create button');
      
      // Wait for navigation to hangout page
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        const currentUrl = page.url();
        console.log(`📍 Current URL after creation: ${currentUrl}`);
        
        if (currentUrl.includes('/hangout/')) {
          console.log('✅ Hangout created successfully and navigated to hangout page');
          
          // Extract hangout ID from URL
          const hangoutId = currentUrl.split('/hangout/')[1];
          console.log(`🎯 Created hangout ID: ${hangoutId}`);
          
          // Test 5: Test Hangout API Directly
          console.log('\n🔍 Test 5: Test Hangout API Directly');
          try {
            const apiUrl = `${RAILWAY_APP_URL}/api/hangouts/${hangoutId}`;
            console.log(`🎯 Testing API: ${apiUrl}`);
            
            const response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
              }
            });
            
            console.log(`📊 API Response Status: ${response.status}`);
            
            if (response.ok) {
              const data = await response.json();
              console.log('✅ Hangout API returned data successfully');
              console.log(`📋 Hangout Title: ${data.hangout?.title || data.title || 'No title'}`);
              console.log(`📋 Hangout ID: ${data.hangout?.id || data.id || 'No ID'}`);
            } else {
              const errorText = await response.text();
              console.log(`❌ Hangout API failed: ${response.status} - ${errorText}`);
            }
          } catch (apiError) {
            console.log(`❌ Hangout API error: ${apiError.message}`);
          }
          
        } else {
          throw new Error(`Failed to create hangout. Redirected to: ${currentUrl}`);
        }
      } catch (navError) {
        console.log('❌ Navigation timeout after creating hangout');
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
      }
    } else {
      console.log('❌ Hangout creation form elements not found');
      console.log('   Title input found:', !!titleInput);
      console.log('   Description input found:', !!descriptionInput);
      console.log('   Create button found:', !!createButton);
    }

    // Test 6: Test Opening Existing Hangout
    console.log('\n🔍 Test 6: Test Opening Existing Hangout');
    const existingHangoutId = 'hangout_1759791292472_zlwy0rj6k'; // Coffee Meetup
    const existingHangoutUrl = `${RAILWAY_APP_URL}/hangout/${existingHangoutId}`;
    
    try {
      await page.goto(existingHangoutUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      const currentUrl = page.url();
      console.log(`📍 Current URL after opening existing hangout: ${currentUrl}`);
      
      if (currentUrl.includes('/hangout/')) {
        console.log('✅ Successfully opened existing hangout');
      } else {
        console.log('❌ Failed to open existing hangout');
      }
    } catch (navError) {
      console.log('❌ Navigation timeout when opening existing hangout');
    }

    console.log('\n🎉 Production functionality test completed!');
    console.log('✅ All major tests have been executed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testProductionComplete();

