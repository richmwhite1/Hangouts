const puppeteer = require('puppeteer');

async function testCreatePageAccess() {
  console.log('🚀 Testing create page access...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(`📝 Console: ${msg.text()}`);
    }
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  try {
    // Go directly to create page
    console.log('➕ Going to create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/create')) {
      console.log('✅ Create page loaded successfully!');
      
      // Check if we can see the create form
      const createForm = await page.$('form');
      if (createForm) {
        console.log('✅ Create hangout form is visible');
        
        // Check for form elements
        const titleInput = await page.$('input[placeholder*="title" i], input[name*="title" i]');
        if (titleInput) {
          console.log('✅ Title input found');
        }
        
        const descriptionInput = await page.$('textarea, input[placeholder*="description" i]');
        if (descriptionInput) {
          console.log('✅ Description input found');
        }
        
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          console.log('✅ Submit button found');
        } else {
          // Try to find any button with "Create" text
          const createButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => btn.textContent.includes('Create'));
          });
          if (createButton) {
            console.log('✅ Create button found');
          }
        }
        
        // Try to fill out the form
        console.log('📝 Testing form interaction...');
        if (titleInput) {
          await titleInput.type('Test Hangout');
          console.log('✅ Entered title');
        }
        
        if (descriptionInput) {
          await descriptionInput.type('This is a test hangout');
          console.log('✅ Entered description');
        }
        
        console.log('🎉 Create page is working correctly!');
        
      } else {
        console.log('❌ Create hangout form not found');
        
        // Check what's actually on the page
        const pageContent = await page.content();
        if (pageContent.includes('Sign In Required')) {
          console.log('❌ Still showing sign in required message');
        } else if (pageContent.includes('Create New Hangout')) {
          console.log('✅ Page shows "Create New Hangout" title');
        } else {
          console.log('❓ Unknown page content');
        }
      }
    } else {
      console.log('❌ Create page redirected');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testCreatePageAccess().catch(console.error);
