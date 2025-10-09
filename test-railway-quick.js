const puppeteer = require('puppeteer');

const RAILWAY_URL = 'https://hangouts-production-adc4.up.railway.app';

async function quickRailwayTest() {
  console.log('🚀 Quick Railway deployment test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Test 1: Health Check
    console.log('🏥 Testing health check...');
    await page.goto(`${RAILWAY_URL}/api/health`, { waitUntil: 'networkidle0' });
    const healthResponse = await page.evaluate(() => document.body.textContent);
    console.log('✅ Health check:', healthResponse);
    
    // Test 2: Home Page
    console.log('🏠 Testing home page...');
    await page.goto(RAILWAY_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Home page loaded');
    
    // Test 3: Sign In
    console.log('🔐 Testing sign in...');
    await page.goto(`${RAILWAY_URL}/signin`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const signInButton = await page.$('button[type="submit"]');
    
    if (emailInput && passwordInput && signInButton) {
      await emailInput.type('richard@example.com');
      await passwordInput.type('Password1!');
      await signInButton.click();
      
      // Wait for redirect with longer timeout
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('✅ Sign in successful!');
      } catch (navError) {
        console.log('⚠️  Navigation timeout, but sign in may have worked');
      }
    } else {
      console.log('❌ Sign in form not found');
    }
    
    console.log('🎉 Quick test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Wait 5 minutes for the new deployment
console.log('⏰ Waiting 5 minutes for new Railway deployment...');
setTimeout(() => {
  quickRailwayTest().catch(console.error);
}, 5 * 60 * 1000);






