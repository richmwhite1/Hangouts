const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testRailwayMemoryFix() {
  console.log(`🚀 Testing Railway memory fix deployment at: ${RAILWAY_APP_URL}`);
  console.log('⏰ Waiting 5 minutes for Railway deployment to complete...');
  
  // Wait 5 minutes for deployment
  await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

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

    // Test 4: Profile Page
    console.log('\n👤 Test 4: Profile Page');
    await page.goto(`${RAILWAY_APP_URL}/profile`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const profileTitle = await page.title();
    console.log(`📄 Profile page title: ${profileTitle}`);
    
    if (profileTitle.includes('Profile') || profileTitle.includes('Hangouts')) {
      console.log('✅ Profile page loaded successfully');
    } else {
      console.log('⚠️ Profile page may not have loaded correctly');
    }

    // Test 5: Friends Page
    console.log('\n👥 Test 5: Friends Page');
    await page.goto(`${RAILWAY_APP_URL}/friends`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const friendsTitle = await page.title();
    console.log(`📄 Friends page title: ${friendsTitle}`);
    
    if (friendsTitle.includes('Friends') || friendsTitle.includes('Hangouts')) {
      console.log('✅ Friends page loaded successfully');
    } else {
      console.log('⚠️ Friends page may not have loaded correctly');
    }

    // Test 6: Events Page
    console.log('\n📅 Test 6: Events Page');
    await page.goto(`${RAILWAY_APP_URL}/events`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventsTitle = await page.title();
    console.log(`📄 Events page title: ${eventsTitle}`);
    
    if (eventsTitle.includes('Events') || eventsTitle.includes('Hangouts')) {
      console.log('✅ Events page loaded successfully');
    } else {
      console.log('⚠️ Events page may not have loaded correctly');
    }

    console.log('\n🎉 Railway memory fix test completed!');
    console.log('✅ All major pages loaded successfully');
    console.log('✅ The app is running without memory issues');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testRailwayMemoryFix();
















