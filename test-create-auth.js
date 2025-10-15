const puppeteer = require('puppeteer');

async function testCreatePageAuth() {
  console.log('🚀 Testing create page authentication...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('Create page auth state')) {
      console.log(`🔍 Auth State: ${msg.text()}`);
    }
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  try {
    // Go to home page first
    console.log('📄 Going to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to go to create page
    console.log('➕ Going to create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/signin')) {
      console.log('❌ Create page redirected to signin');
      
      // Check if there's a signin form
      const signinForm = await page.$('form');
      if (signinForm) {
        console.log('✅ Signin form is visible');
        
        // Try to sign in with a test account
        console.log('🔑 Attempting to sign in...');
        
        // Look for email input
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
          await emailInput.type('test@example.com');
          console.log('📧 Entered email');
        }
        
        // Look for password input
        const passwordInput = await page.$('input[type="password"]');
        if (passwordInput) {
          await passwordInput.type('password123');
          console.log('🔒 Entered password');
        }
        
        // Look for sign in button
        const signinButton = await page.$('button[type="submit"]');
        if (signinButton) {
          await signinButton.click();
          console.log('🖱️ Clicked sign in button');
          
          // Wait for navigation
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const newUrl = page.url();
          console.log(`📍 URL after signin attempt: ${newUrl}`);
        }
      }
    } else if (currentUrl.includes('/create')) {
      console.log('✅ Create page loaded successfully!');
      
      // Check if we can see the create form
      const createForm = await page.$('form');
      if (createForm) {
        console.log('✅ Create hangout form is visible');
      } else {
        console.log('❌ Create hangout form not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testCreatePageAuth().catch(console.error);





