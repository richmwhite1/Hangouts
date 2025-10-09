const puppeteer = require('puppeteer');

const LOCAL_APP_URL = 'http://localhost:3000';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testLocalHangouts() {
  console.log(`🚀 Testing hangout creation and opening locally at: ${LOCAL_APP_URL}`);
  console.log('⏰ Waiting 10 seconds for local server to start...');
  
  // Wait for local server to start
  await new Promise(resolve => setTimeout(resolve, 10000));

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Listen for console messages and page errors
  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER PAGE ERROR: ${err.message}`));

  try {
    // Test 1: Health Check
    console.log('\n🏥 Test 1: Health Check');
    try {
      const healthResponse = await fetch(`${LOCAL_APP_URL}/api/health`);
      const healthData = await healthResponse.json();
      console.log('✅ Health check response:', healthData);
      if (healthResponse.status !== 200 || healthData.status !== 'ok') {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.log('⚠️ Health check failed, but continuing with tests...');
    }

    // Test 2: Sign In
    console.log('\n🔐 Test 2: Sign In');
    await page.goto(`${LOCAL_APP_URL}/signin`, { waitUntil: 'networkidle0' });
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

    // Test 3: Create a New Hangout
    console.log('\n🏠 Test 3: Create a New Hangout');
    await page.goto(`${LOCAL_APP_URL}/create`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const createPageTitle = await page.title();
    console.log(`📄 Create page title: ${createPageTitle}`);
    
    // Look for hangout creation form elements
    const titleInput = await page.$('input[name="title"], input[placeholder*="title"], input[placeholder*="Title"]');
    const descriptionInput = await page.$('textarea[name="description"], textarea[placeholder*="description"], textarea[placeholder*="Description"]');
    const locationInput = await page.$('input[name="location"], input[placeholder*="location"], input[placeholder*="Location"]');
    const createButton = await page.$('button[type="submit"], button:has-text("Create"), button:has-text("create")');
    
    if (titleInput && descriptionInput && createButton) {
      console.log('✅ Hangout creation form found');
      
      const hangoutTitle = `Test Hangout ${Date.now()}`;
      const hangoutDescription = 'This is a test hangout created by Puppeteer for local testing.';
      const hangoutLocation = 'Test Location, City';
      
      await titleInput.type(hangoutTitle);
      await descriptionInput.type(hangoutDescription);
      
      if (locationInput) {
        await locationInput.type(hangoutLocation);
      }
      
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
          
          // Test 4: Verify Hangout Page Loads
          console.log('\n🔍 Test 4: Verify Hangout Page Loads');
          const hangoutPageTitle = await page.title();
          console.log(`📄 Hangout page title: ${hangoutPageTitle}`);
          
          // Look for hangout content
          const hangoutContent = await page.$('[class*="hangout"], [class*="event"], [data-testid*="hangout"]');
          if (hangoutContent) {
            console.log('✅ Hangout content is visible on the page');
          } else {
            console.log('⚠️ Hangout content not found, but page loaded');
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
          
          // Test 5: Test Hangout API Directly
          console.log('\n🔍 Test 5: Test Hangout API Directly');
          try {
            const apiUrl = `${LOCAL_APP_URL}/api/hangouts/${hangoutId}`;
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
          
          // Test 6: Navigate to Home and Test Opening Hangout
          console.log('\n🏠 Test 6: Navigate to Home and Test Opening Hangout');
          await page.goto(`${LOCAL_APP_URL}`, { waitUntil: 'networkidle0' });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Look for hangout cards
          const hangoutCards = await page.$$('a[href*="/hangout/"]');
          console.log(`📊 Found ${hangoutCards.length} hangout cards on home page`);
          
          if (hangoutCards.length > 0) {
            console.log('✅ Hangout cards found on home page');
            
            // Click on the first hangout card
            const firstHangoutCard = hangoutCards[0];
            const hangoutUrl = await firstHangoutCard.evaluate(el => el.href);
            console.log(`🎯 Clicking on hangout: ${hangoutUrl}`);
            
            await firstHangoutCard.click();
            
            // Wait for navigation
            try {
              await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
              const currentUrlAfterClick = page.url();
              console.log(`📍 Current URL after click: ${currentUrlAfterClick}`);
              
              if (currentUrlAfterClick.includes('/hangout/')) {
                console.log('✅ Successfully opened hangout from home page');
              } else {
                console.log('❌ Failed to navigate to hangout page');
              }
            } catch (navError) {
              console.log('❌ Navigation timeout when clicking hangout card');
            }
          } else {
            console.log('⚠️ No hangout cards found on home page');
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

    console.log('\n🎉 Local hangout testing completed!');
    console.log('✅ All tests have been executed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Don't close browser immediately so we can see the result
    console.log('\n⏰ Keeping browser open for 10 seconds to see results...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

testLocalHangouts();






