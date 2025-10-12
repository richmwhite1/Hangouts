const puppeteer = require('puppeteer');

async function testFrontend() {
  console.log('🚀 Starting frontend tests...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Test 1: Home page
    console.log('📄 Testing home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const homeTitle = await page.title();
    console.log(`✅ Home page loaded: ${homeTitle}`);
    
    // Test 2: Friends page (should redirect to signin)
    console.log('👥 Testing friends page...');
    try {
      await page.goto('http://localhost:3000/friends', { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const friendsUrl = page.url();
      console.log(`📍 Friends page URL: ${friendsUrl}`);
      
      if (friendsUrl.includes('/signin')) {
        console.log('✅ Friends page correctly redirected to signin');
      } else {
        console.log('❌ Friends page did NOT redirect to signin');
      }
    } catch (error) {
      console.log(`❌ Friends page failed to load: ${error.message}`);
      const currentUrl = page.url();
      console.log(`📍 Current URL after error: ${currentUrl}`);
    }
    
    // Test 3: Create page (should redirect to signin)
    console.log('➕ Testing create page...');
    try {
      await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const createUrl = page.url();
      console.log(`📍 Create page URL: ${createUrl}`);
      
      if (createUrl.includes('/signin')) {
        console.log('✅ Create page correctly redirected to signin');
      } else {
        console.log('❌ Create page did NOT redirect to signin');
      }
    } catch (error) {
      console.log(`❌ Create page failed to load: ${error.message}`);
      const currentUrl = page.url();
      console.log(`📍 Current URL after error: ${currentUrl}`);
    }
    
    // Test 4: Signin page
    console.log('🔐 Testing signin page...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const signinTitle = await page.title();
    console.log(`✅ Signin page loaded: ${signinTitle}`);
    
    // Test 5: Try to sign in (if possible)
    console.log('🔍 Checking if signin form is visible...');
    const signinForm = await page.$('form');
    if (signinForm) {
      console.log('✅ Signin form is visible');
    } else {
      console.log('❌ Signin form not found');
    }
    
    console.log('🎉 Frontend tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testFrontend().catch(console.error);
