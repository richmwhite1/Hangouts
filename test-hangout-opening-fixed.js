const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

// Use an existing hangout ID from the database
const EXISTING_HANGOUT_ID = 'hangout_1759791292472_zlwy0rj6k'; // Coffee Meetup

async function testHangoutOpeningFixed() {
  console.log(`🚀 Testing hangout opening with existing hangout at: ${RAILWAY_APP_URL}`);
  console.log(`🎯 Using hangout ID: ${EXISTING_HANGOUT_ID}`);
  console.log('⏰ Waiting 3 minutes for Railway deployment to complete...');
  
  // Wait 3 minutes for deployment
  await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000));

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

    // Test 2: Sign In
    console.log('\n🔐 Test 2: Sign In');
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

    // Test 3: Direct Hangout Access
    console.log('\n🔍 Test 3: Direct Hangout Access');
    const hangoutUrl = `${RAILWAY_APP_URL}/hangout/${EXISTING_HANGOUT_ID}`;
    console.log(`🎯 Navigating directly to: ${hangoutUrl}`);
    
    await page.goto(hangoutUrl, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for API calls
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/hangout/')) {
      console.log('✅ Successfully navigated to hangout page');
      
      // Check if the page loaded properly
      const pageTitle = await page.title();
      console.log(`📄 Page title: ${pageTitle}`);
      
      // Look for hangout content
      const hangoutContent = await page.$('[class*="hangout"], [class*="event"], [data-testid*="hangout"]');
      if (hangoutContent) {
        console.log('✅ Hangout content is visible on the page');
      } else {
        console.log('⚠️ Hangout content not found, but navigation was successful');
      }
      
      // Check for any error messages
      const errorElements = await page.$$('[class*="error"], [class*="Error"], [class*="failed"]');
      if (errorElements.length > 0) {
        console.log(`⚠️ Found ${errorElements.length} potential error elements`);
        for (let i = 0; i < Math.min(errorElements.length, 3); i++) {
          const errorText = await errorElements[i].evaluate(el => el.textContent);
          console.log(`   Error ${i + 1}: ${errorText?.substring(0, 100)}...`);
        }
      } else {
        console.log('✅ No error elements found on hangout page');
      }
      
      // Check for loading state
      const loadingElements = await page.$$('[class*="loading"], [class*="Loading"], [class*="spinner"]');
      if (loadingElements.length > 0) {
        console.log('⚠️ Page might still be loading...');
      } else {
        console.log('✅ No loading indicators found - page should be fully loaded');
      }
      
    } else {
      console.log('❌ Failed to navigate to hangout page');
      console.log(`   Expected URL to contain '/hangout/', but got: ${currentUrl}`);
    }

    // Test 4: Test Hangout API Directly
    console.log('\n🔍 Test 4: Test Hangout API Directly');
    try {
      const apiUrl = `${RAILWAY_APP_URL}/api/hangouts/${EXISTING_HANGOUT_ID}`;
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

    console.log('\n🎉 Hangout opening test completed!');
    console.log('✅ All tests have been executed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testHangoutOpeningFixed();


