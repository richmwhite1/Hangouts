const puppeteer = require('puppeteer');

async function testSignInAndCreate() {
  console.log('🚀 Testing sign in and create page access...');
  
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
    // Go to signin page
    console.log('🔐 Going to signin page...');
    await page.goto('http://localhost:3000/signin', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we can see the signin form
    const signinForm = await page.$('form');
    if (signinForm) {
      console.log('✅ Signin form is visible');
      
      // Look for "Sign up" link or button
      const signupLink = await page.$('a[href*="signup"]');
      if (signupLink) {
        console.log('🔗 Found signup link, clicking...');
        await signupLink.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const signupUrl = page.url();
        console.log(`📍 Signup URL: ${signupUrl}`);
        
        // Try to create a test account
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
          const testEmail = `test${Date.now()}@example.com`;
          await emailInput.type(testEmail);
          console.log(`📧 Entered email: ${testEmail}`);
        }
        
        const passwordInput = await page.$('input[type="password"]');
        if (passwordInput) {
          await passwordInput.type('password123');
          console.log('🔒 Entered password');
        }
        
        // Look for sign up button
        const signupButton = await page.$('button[type="submit"]');
        if (signupButton) {
          console.log('🖱️ Clicking sign up button...');
          await signupButton.click();
          
          // Wait for signup to complete
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          const afterSignupUrl = page.url();
          console.log(`📍 URL after signup: ${afterSignupUrl}`);
          
          // Now try to go to create page
          console.log('➕ Going to create page after signup...');
          await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const createUrl = page.url();
          console.log(`📍 Create page URL: ${createUrl}`);
          
          if (createUrl.includes('/create')) {
            console.log('🎉 SUCCESS: Create page loaded after signup!');
            
            // Check if we can see the create form
            const createForm = await page.$('form');
            if (createForm) {
              console.log('✅ Create hangout form is visible');
            } else {
              console.log('❌ Create hangout form not found');
            }
          } else {
            console.log('❌ Create page still redirected after signup');
          }
        }
      }
    } else {
      console.log('❌ Signin form not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSignInAndCreate().catch(console.error);













