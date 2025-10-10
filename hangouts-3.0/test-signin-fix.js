const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testSignInFix() {
  console.log(`🚀 Testing sign-in fix at: ${RAILWAY_APP_URL}`);
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

    // Test 2: Sign In Page
    console.log('\n🔐 Test 2: Sign In Page');
    await page.goto(`${RAILWAY_APP_URL}/signin`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    const signInTitle = await page.title();
    if (signInTitle.includes('Sign In')) {
      console.log('✅ Sign in page loaded successfully');
    } else {
      throw new Error(`Sign in page title incorrect: ${signInTitle}`);
    }

    // Test 3: Sign In with Test User
    console.log('\n👤 Test 3: Sign In with Test User');
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const signInButton = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && signInButton) {
      await emailInput.type(TEST_USER_EMAIL);
      await passwordInput.type(TEST_USER_PASSWORD);
      await signInButton.click();
      
      // Wait for navigation or error
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('✅ Sign in successful - navigation completed');
      } catch (navError) {
        // Check if we're still on signin page (error) or moved to dashboard (success)
        const currentUrl = page.url();
        if (currentUrl.includes('/signin')) {
          // Check for error messages
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

      // Test 4: Verify we can access protected pages
      console.log('\n🏠 Test 4: Access Protected Pages');
      await page.goto(`${RAILWAY_APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      const dashboardTitle = await page.title();
      if (dashboardTitle.includes('Dashboard') || dashboardTitle.includes('Hangouts')) {
        console.log('✅ Dashboard page accessible');
      } else {
        console.log(`⚠️ Dashboard page title: ${dashboardTitle}`);
      }

      // Test 5: Check Friends Page
      console.log('\n👥 Test 5: Friends Page');
      await page.goto(`${RAILWAY_APP_URL}/friends`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      const friendsTitle = await page.title();
      if (friendsTitle.includes('Friends') || friendsTitle.includes('Hangouts')) {
        console.log('✅ Friends page accessible');
      } else {
        console.log(`⚠️ Friends page title: ${friendsTitle}`);
      }

      console.log('\n🎉 Sign-in fix test completed successfully!');
      console.log('✅ The database schema issue has been resolved');
      console.log('✅ Users can now sign in without the favoriteActivities column error');

    } else {
      throw new Error('Sign in form elements not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testSignInFix();



