const puppeteer = require('puppeteer');

async function comprehensiveTest() {
  console.log('🚀 Starting comprehensive frontend tests...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  let testResults = {
    home: false,
    signin: false,
    friendsRedirect: false,
    createRedirect: false,
    signinForm: false
  };
  
  try {
    // Test 1: Home page
    console.log('📄 Test 1: Home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const homeTitle = await page.title();
    if (homeTitle === 'Hangouts 3.0') {
      testResults.home = true;
      console.log('✅ Home page loads correctly');
    } else {
      console.log('❌ Home page failed');
    }
    
    // Test 2: Signin page
    console.log('🔐 Test 2: Signin page...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const signinUrl = page.url();
    if (signinUrl.includes('/signin')) {
      testResults.signin = true;
      console.log('✅ Signin page loads correctly');
    } else {
      console.log('❌ Signin page failed');
    }
    
    // Check for signin form
    const signinForm = await page.$('form');
    if (signinForm) {
      testResults.signinForm = true;
      console.log('✅ Signin form is visible');
    } else {
      console.log('❌ Signin form not found');
    }
    
    // Test 3: Friends page redirect
    console.log('👥 Test 3: Friends page redirect...');
    await page.goto('http://localhost:3000/friends', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const friendsUrl = page.url();
    if (friendsUrl.includes('/signin')) {
      testResults.friendsRedirect = true;
      console.log('✅ Friends page correctly redirects to signin');
    } else {
      console.log('❌ Friends page redirect failed');
    }
    
    // Test 4: Create page redirect
    console.log('➕ Test 4: Create page redirect...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const createUrl = page.url();
    if (createUrl.includes('/signin')) {
      testResults.createRedirect = true;
      console.log('✅ Create page correctly redirects to signin');
    } else {
      console.log('❌ Create page redirect failed');
    }
    
    // Test 5: Try to sign in (simulate clicking signin button)
    console.log('🔑 Test 5: Testing signin functionality...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for signin buttons
    const signinButtons = await page.$$('button');
    console.log(`🔍 Found ${signinButtons.length} buttons on signin page`);
    
    // Check if we can find Clerk signin elements
    const clerkElements = await page.$$('[data-clerk-js-script]');
    if (clerkElements.length > 0) {
      console.log('✅ Clerk authentication is properly loaded');
    } else {
      console.log('❌ Clerk authentication not found');
    }
    
    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    console.log(`Home page loads: ${testResults.home ? '✅' : '❌'}`);
    console.log(`Signin page loads: ${testResults.signin ? '✅' : '❌'}`);
    console.log(`Signin form visible: ${testResults.signinForm ? '✅' : '❌'}`);
    console.log(`Friends redirects: ${testResults.friendsRedirect ? '✅' : '❌'}`);
    console.log(`Create redirects: ${testResults.createRedirect ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(testResults).every(result => result === true);
    console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 SUCCESS: The app is working correctly!');
      console.log('   - Users need to sign in to access friends and create pages');
      console.log('   - Authentication is properly enforced');
      console.log('   - All pages load correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

comprehensiveTest().catch(console.error);












