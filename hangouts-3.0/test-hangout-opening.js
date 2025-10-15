const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testHangoutOpening() {
  console.log(`🚀 Testing hangout opening fix at: ${RAILWAY_APP_URL}`);
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

    // Test 3: Navigate to Home Page and Look for Hangouts
    console.log('\n🏠 Test 3: Home Page and Hangout Discovery');
    await page.goto(`${RAILWAY_APP_URL}`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for hangout cards
    const hangoutCards = await page.$$('[data-testid="hangout-card"], .hangout-card, .event-card, [class*="hangout"], [class*="event"]');
    console.log(`📊 Found ${hangoutCards.length} potential hangout cards`);
    
    if (hangoutCards.length > 0) {
      console.log('✅ Hangout cards found on home page');
      
      // Try to click on the first hangout
      console.log('\n🔍 Test 4: Clicking on First Hangout');
      const firstHangout = hangoutCards[0];
      
      // Get hangout title for logging
      const hangoutTitle = await firstHangout.evaluate(el => el.textContent?.substring(0, 50) || 'Unknown');
      console.log(`🎯 Attempting to open hangout: ${hangoutTitle}...`);
      
      // Click on the hangout
      await firstHangout.click();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for navigation and API calls
      
      const currentUrl = page.url();
      console.log(`📍 Current URL after click: ${currentUrl}`);
      
      if (currentUrl.includes('/hangout/') || currentUrl.includes('/event/')) {
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
        
      } else {
        console.log('❌ Failed to navigate to hangout page');
        console.log(`   Expected URL to contain '/hangout/' or '/event/', but got: ${currentUrl}`);
      }
    } else {
      console.log('⚠️ No hangout cards found on home page');
      console.log('   This might mean there are no hangouts to test, or the selectors need updating');
      
      // Try to create a hangout first
      console.log('\n🏗️ Test 4: Creating a Test Hangout');
      await page.goto(`${RAILWAY_APP_URL}/create`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const titleInput = await page.$('input[placeholder*="title" i], input[name*="title" i]');
      if (titleInput) {
        await titleInput.type('Test Hangout for Opening');
        console.log('✅ Added hangout title');
        
        const submitButton = await page.$('button[type="submit"], button:has-text("Create")');
        if (submitButton) {
          await submitButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('✅ Attempted to create hangout');
          
          // Go back to home page to look for the new hangout
          await page.goto(`${RAILWAY_APP_URL}`, { waitUntil: 'networkidle0' });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const newHangoutCards = await page.$$('[data-testid="hangout-card"], .hangout-card, .event-card, [class*="hangout"], [class*="event"]');
          console.log(`📊 Found ${newHangoutCards.length} hangout cards after creation`);
          
          if (newHangoutCards.length > 0) {
            console.log('✅ Hangout created successfully, now testing opening...');
            // Test opening the newly created hangout
            await newHangoutCards[0].click();
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const finalUrl = page.url();
            if (finalUrl.includes('/hangout/') || finalUrl.includes('/event/')) {
              console.log('✅ Successfully opened newly created hangout');
            } else {
              console.log('❌ Failed to open newly created hangout');
            }
          }
        }
      }
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

testHangoutOpening();










