const puppeteer = require('puppeteer');

async function testApp() {
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
      location: msg.location()
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
  
  console.log('🚀 Starting app functionality tests...\n');
  
  try {
    // Test 1: Home page
    console.log('📄 Testing home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const homeErrors = consoleMessages.filter(msg => msg.type === 'error');
    const homePageErrors = pageErrors.length;
    
    console.log(`   ✅ Home page loaded`);
    console.log(`   📊 Console errors: ${homeErrors.length}`);
    console.log(`   📊 Page errors: ${homePageErrors}`);
    
    if (homeErrors.length > 0) {
      console.log('   ⚠️  Console errors found:');
      homeErrors.forEach(error => {
        console.log(`      - ${error.text}`);
      });
    }
    
    // Test 2: Sign in page
    console.log('\n📄 Testing sign in page...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const signinErrors = consoleMessages.filter(msg => msg.type === 'error' && msg.location().url.includes('signin'));
    console.log(`   ✅ Sign in page loaded`);
    console.log(`   📊 Console errors: ${signinErrors.length}`);
    
    // Test 3: Sign up page
    console.log('\n📄 Testing sign up page...');
    await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const signupErrors = consoleMessages.filter(msg => msg.type === 'error' && msg.location().url.includes('signup'));
    console.log(`   ✅ Sign up page loaded`);
    console.log(`   📊 Console errors: ${signupErrors.length}`);
    
    // Test 4: Create hangout page
    console.log('\n📄 Testing create hangout page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const createErrors = consoleMessages.filter(msg => msg.type === 'error' && msg.location().url.includes('create'));
    console.log(`   ✅ Create hangout page loaded`);
    console.log(`   📊 Console errors: ${createErrors.length}`);
    
    // Test 5: Friends page
    console.log('\n📄 Testing friends page...');
    await page.goto('http://localhost:3000/friends', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const friendsErrors = consoleMessages.filter(msg => msg.type === 'error' && msg.location().url.includes('friends'));
    console.log(`   ✅ Friends page loaded`);
    console.log(`   📊 Console errors: ${friendsErrors.length}`);
    
    // Test 6: Messages page
    console.log('\n📄 Testing messages page...');
    await page.goto('http://localhost:3000/messages', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const messagesErrors = consoleMessages.filter(msg => msg.type === 'error' && msg.location().url.includes('messages'));
    console.log(`   ✅ Messages page loaded`);
    console.log(`   📊 Console errors: ${messagesErrors.length}`);
    
    // Test 7: Test hangout creation functionality
    console.log('\n🧪 Testing hangout creation...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle0' });
    
    // Look for form elements with more specific selectors
    const inputs = await page.$$('input, textarea');
    console.log(`   📊 Found ${inputs.length} input/textarea elements`);
    
    // Look for common form field patterns
    const titleInput = await page.$('input[placeholder*="title" i], input[name*="title" i], input[placeholder*="name" i]');
    const descriptionInput = await page.$('textarea[placeholder*="description" i], textarea[name*="description" i], textarea[placeholder*="details" i]');
    const locationInput = await page.$('input[placeholder*="location" i], input[name*="location" i], input[placeholder*="where" i]');
    
    if (titleInput) {
      console.log('   ✅ Title input found');
      await titleInput.type('Test Hangout');
    }
    if (descriptionInput) {
      console.log('   ✅ Description input found');
      await descriptionInput.type('This is a test hangout for functionality testing');
    }
    if (locationInput) {
      console.log('   ✅ Location input found');
      await locationInput.type('Test Location');
    }
    
    if (titleInput || descriptionInput || locationInput) {
      console.log('   ✅ Form fields can be filled');
    } else {
      console.log('   ⚠️  No recognizable form elements found');
    }
    
    // Test 8: Check for authentication
    console.log('\n🔐 Testing authentication...');
    const authButton = await page.$('a[href*="signin"]');
    if (authButton) {
      console.log('   ℹ️  User not authenticated (expected for testing)');
    } else {
      console.log('   ✅ User appears to be authenticated');
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Total console errors: ${consoleMessages.filter(msg => msg.type === 'error').length}`);
    console.log(`   Total page errors: ${pageErrors.length}`);
    console.log(`   Pages tested: 7`);
    
    const allErrors = consoleMessages.filter(msg => msg.type === 'error');
    if (allErrors.length > 0) {
      console.log('\n⚠️  ALL CONSOLE ERRORS:');
      allErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.text}`);
        console.log(`      Location: ${error.location().url}:${error.location().lineNumber}`);
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

testApp().catch(console.error);
