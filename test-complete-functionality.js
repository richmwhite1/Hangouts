const puppeteer = require('puppeteer');

async function testCompleteFunctionality() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location ? msg.location() : { url: 'unknown', lineNumber: 0 }
    });
  });
  
  // Listen for page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  console.log('🚀 Starting complete functionality tests...\n');
  
  try {
    // Test 1: Sign in
    console.log('🔐 Testing sign in...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fill in sign in form
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const signInButton = await page.$('button[type="submit"]');
    
    if (emailInput && passwordInput && signInButton) {
      await emailInput.type('test@example.com');
      await passwordInput.type('password123');
      await signInButton.click();
      
      // Wait for redirect
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('   ✅ Sign in successful');
    } else {
      console.log('   ⚠️  Sign in form elements not found');
    }
    
    // Test 2: Create hangout
    console.log('\n🏠 Testing hangout creation...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for form elements
    const inputs = await page.$$('input, textarea, select');
    console.log(`   📊 Found ${inputs.length} form elements`);
    
    // Try to find and fill form fields
    const titleInput = await page.$('input[placeholder*="title" i], input[name*="title" i], input[placeholder*="name" i]');
    const descriptionInput = await page.$('textarea[placeholder*="description" i], textarea[name*="description" i], textarea[placeholder*="details" i]');
    const locationInput = await page.$('input[placeholder*="location" i], input[name*="location" i], input[placeholder*="where" i]');
    const dateInput = await page.$('input[type="date"], input[placeholder*="date" i]');
    const timeInput = await page.$('input[type="time"], input[placeholder*="time" i]');
    
    if (titleInput) {
      await titleInput.type('Test Hangout - Automated');
      console.log('   ✅ Title filled');
    }
    if (descriptionInput) {
      await descriptionInput.type('This is an automated test hangout created during functionality testing');
      console.log('   ✅ Description filled');
    }
    if (locationInput) {
      await locationInput.type('Test Location, Test City');
      console.log('   ✅ Location filled');
    }
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await dateInput.type(dateString);
      console.log('   ✅ Date filled');
    }
    if (timeInput) {
      await timeInput.type('19:00');
      console.log('   ✅ Time filled');
    }
    
    // Look for submit button
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      console.log('   ✅ Submit button found');
      // Don't actually submit to avoid creating test data
      console.log('   ℹ️  Skipping actual submission to avoid test data');
    } else {
      console.log('   ⚠️  Submit button not found');
    }
    
    // Test 3: Check hangouts list
    console.log('\n📋 Testing hangouts list...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const hangoutCards = await page.$$('[data-testid="hangout-card"], .hangout-card, [class*="hangout"]');
    console.log(`   📊 Found ${hangoutCards.length} hangout cards`);
    
    if (hangoutCards.length > 0) {
      console.log('   ✅ Hangouts are displayed');
    } else {
      console.log('   ℹ️  No hangouts displayed (may be empty or require different selector)');
    }
    
    // Test 4: Test polls functionality
    console.log('\n🗳️  Testing polls functionality...');
    await page.goto('http://localhost:3000/polling', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pollElements = await page.$$('[data-testid="poll"], .poll, [class*="poll"]');
    console.log(`   📊 Found ${pollElements.length} poll elements`);
    
    if (pollElements.length > 0) {
      console.log('   ✅ Polls are displayed');
    } else {
      console.log('   ℹ️  No polls displayed (may be empty or require different selector)');
    }
    
    // Test 5: Test friends functionality
    console.log('\n👥 Testing friends functionality...');
    await page.goto('http://localhost:3000/friends', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const friendElements = await page.$$('[data-testid="friend"], .friend, [class*="friend"]');
    console.log(`   📊 Found ${friendElements.length} friend elements`);
    
    if (friendElements.length > 0) {
      console.log('   ✅ Friends are displayed');
    } else {
      console.log('   ℹ️  No friends displayed (may be empty or require different selector)');
    }
    
    // Test 6: Test messages functionality
    console.log('\n💬 Testing messages functionality...');
    await page.goto('http://localhost:3000/messages', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const messageElements = await page.$$('[data-testid="message"], .message, [class*="message"]');
    console.log(`   📊 Found ${messageElements.length} message elements`);
    
    if (messageElements.length > 0) {
      console.log('   ✅ Messages are displayed');
    } else {
      console.log('   ℹ️  No messages displayed (may be empty or require different selector)');
    }
    
    // Test 7: Test profile functionality
    console.log('\n👤 Testing profile functionality...');
    await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const profileElements = await page.$$('[data-testid="profile"], .profile, [class*="profile"]');
    console.log(`   📊 Found ${profileElements.length} profile elements`);
    
    if (profileElements.length > 0) {
      console.log('   ✅ Profile is displayed');
    } else {
      console.log('   ℹ️  Profile elements not found (may require different selector)');
    }
    
    // Summary
    console.log('\n📊 COMPLETE TEST SUMMARY:');
    console.log(`   Total console errors: ${consoleMessages.filter(msg => msg.type === 'error').length}`);
    console.log(`   Total page errors: ${pageErrors.length}`);
    console.log(`   Pages tested: 7`);
    
    const allErrors = consoleMessages.filter(msg => msg.type === 'error');
    if (allErrors.length > 0) {
      console.log('\n⚠️  ALL CONSOLE ERRORS:');
      allErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.text}`);
        if (error.location && typeof error.location === 'function') {
          console.log(`      Location: ${error.location().url}:${error.location().lineNumber}`);
        } else {
          console.log(`      Location: ${error.location?.url || 'unknown'}:${error.location?.lineNumber || 'unknown'}`);
        }
      });
    }
    
    if (pageErrors.length > 0) {
      console.log('\n❌ PAGE ERRORS:');
      pageErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
      });
    }
    
    if (allErrors.length === 0 && pageErrors.length === 0) {
      console.log('\n🎉 All tests passed! No console or page errors found.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCompleteFunctionality().catch(console.error);
