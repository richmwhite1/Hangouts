const puppeteer = require('puppeteer');

async function testFrontendErrors() {
  console.log('🚀 Starting frontend error tests...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });
  
  try {
    // Test 1: Home page
    console.log('📄 Testing home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const homeTitle = await page.title();
    console.log(`✅ Home page loaded: ${homeTitle}`);
    
    // Test 2: Signin page directly
    console.log('🔐 Testing signin page directly...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const signinUrl = page.url();
    console.log(`📍 Signin page URL: ${signinUrl}`);
    
    // Check if Clerk components are loading
    const clerkElements = await page.$$('[data-clerk-js-script]');
    console.log(`🔍 Found ${clerkElements.length} Clerk script elements`);
    
    // Check for any visible signin form
    const signinForm = await page.$('form');
    if (signinForm) {
      console.log('✅ Signin form is visible');
    } else {
      console.log('❌ Signin form not found');
    }
    
    // Test 3: Friends page
    console.log('👥 Testing friends page...');
    await page.goto('http://localhost:3000/friends', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const friendsUrl = page.url();
    console.log(`📍 Friends page URL: ${friendsUrl}`);
    
    // Test 4: Create page
    console.log('➕ Testing create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const createUrl = page.url();
    console.log(`📍 Create page URL: ${createUrl}`);
    
    console.log('🎉 Frontend error tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testFrontendErrors().catch(console.error);













