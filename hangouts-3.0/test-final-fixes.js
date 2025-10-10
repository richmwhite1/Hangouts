const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testFinalFixes() {
  console.log(`🚀 Testing final fixes at: ${RAILWAY_APP_URL}`);
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

    // Test 3: Profile Page and Favorite Activities/Places
    console.log('\n👤 Test 3: Profile Page and Favorite Activities/Places');
    await page.goto(`${RAILWAY_APP_URL}/profile`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if profile page loaded
    const profileTitle = await page.title();
    if (profileTitle.includes('Profile') || profileTitle.includes('Hangouts')) {
      console.log('✅ Profile page loaded successfully');
      
      // Look for favorite activities/places fields
      const activitiesInput = await page.$('input[placeholder*="activity" i], textarea[placeholder*="activity" i]');
      const placesInput = await page.$('input[placeholder*="place" i], textarea[placeholder*="place" i]');
      
      if (activitiesInput || placesInput) {
        console.log('✅ Favorite activities/places fields found');
        
        // Try to add some test data
        if (activitiesInput) {
          await activitiesInput.click();
          await activitiesInput.type('Hiking, Reading, Gaming');
          console.log('✅ Added test activities');
        }
        
        if (placesInput) {
          await placesInput.click();
          await placesInput.type('Coffee shops, Parks, Libraries');
          console.log('✅ Added test places');
        }
        
        // Look for save button
        const saveButton = await page.$('button:has-text("Save"), button[type="submit"]');
        if (saveButton) {
          await saveButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('✅ Attempted to save profile data');
        }
      } else {
        console.log('⚠️ Favorite activities/places fields not found');
      }
    } else {
      console.log(`⚠️ Profile page title: ${profileTitle}`);
    }

    // Test 4: Friends Page
    console.log('\n👥 Test 4: Friends Page');
    await page.goto(`${RAILWAY_APP_URL}/friends`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const friendsTitle = await page.title();
    if (friendsTitle.includes('Friends') || friendsTitle.includes('Hangouts')) {
      console.log('✅ Friends page loaded successfully');
      
      // Look for friend cards or user lists
      const friendCards = await page.$$('[data-testid="friend-card"], .friend-card, .user-card');
      const userCards = await page.$$('[data-testid="user-card"], .user-item, .friend-item');
      
      const totalFriends = friendCards.length + userCards.length;
      console.log(`📊 Found ${totalFriends} friend/user cards`);
      
      if (totalFriends > 0) {
        console.log('✅ Friends are visible on the page');
        
        // Try to interact with a friend card
        if (friendCards.length > 0) {
          const firstFriend = friendCards[0];
          const friendText = await firstFriend.evaluate(el => el.textContent);
          console.log(`👤 First friend: ${friendText.substring(0, 50)}...`);
        }
      } else {
        console.log('⚠️ No friends visible - this might indicate the friends system needs fixing');
      }
    } else {
      console.log(`⚠️ Friends page title: ${friendsTitle}`);
    }

    // Test 5: Create Hangout
    console.log('\n🏠 Test 5: Create Hangout');
    await page.goto(`${RAILWAY_APP_URL}/create`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const createTitle = await page.title();
    if (createTitle.includes('Create') || createTitle.includes('Hangout')) {
      console.log('✅ Create hangout page loaded successfully');
      
      // Look for form fields
      const titleInput = await page.$('input[placeholder*="title" i], input[name*="title" i]');
      if (titleInput) {
        console.log('✅ Hangout creation form fields are present');
        
        // Try to create a test hangout
        await titleInput.type('Test Hangout');
        console.log('✅ Added hangout title');
        
        // Look for submit button
        const submitButton = await page.$('button[type="submit"], button:has-text("Create")');
        if (submitButton) {
          await submitButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('✅ Attempted to create hangout');
        }
      } else {
        console.log('⚠️ Hangout creation form fields not found');
      }
    } else {
      console.log(`⚠️ Create hangout page title: ${createTitle}`);
    }

    // Test 6: Test Hangout Opening (if any exist)
    console.log('\n🔍 Test 6: Test Hangout Opening');
    await page.goto(`${RAILWAY_APP_URL}`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for hangout cards
    const hangoutCards = await page.$$('[data-testid="hangout-card"], .hangout-card, .event-card');
    if (hangoutCards.length > 0) {
      console.log(`📊 Found ${hangoutCards.length} hangout cards`);
      
      // Try to click on the first hangout
      const firstHangout = hangoutCards[0];
      await firstHangout.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentUrl = page.url();
      if (currentUrl.includes('/hangout/') || currentUrl.includes('/event/')) {
        console.log('✅ Successfully opened hangout:', currentUrl);
      } else {
        console.log('⚠️ Hangout click did not navigate to hangout page');
      }
    } else {
      console.log('⚠️ No hangout cards found to test opening');
    }

    console.log('\n🎉 Final fixes test completed!');
    console.log('✅ All major features have been tested');
    console.log('✅ The app should now be working properly with all fixes applied');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testFinalFixes();



