const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';

async function testPublicAccess() {
  console.log(`🚀 Testing public access at: ${RAILWAY_APP_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER PAGE ERROR: ${err.message}`));
  page.on('requestfailed', request => {
    console.error(`REQUEST FAILED: ${request.url()} ${request.failure().errorText}`);
  });

  try {
    // Test with a known public hangout
    const hangoutId = 'hangout_1759894198768_azbd7bv85'; // From previous test
    const publicHangoutUrl = `${RAILWAY_APP_URL}/hangout/${hangoutId}`;
    
    console.log('Accessing public hangout URL:', publicHangoutUrl);
    
    await page.goto(publicHangoutUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    console.log('Page URL:', currentUrl);
    
    // Check page title
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check for any error messages
    const errorElements = await page.$$('[class*="error"], [class*="Error"]');
    const errorTexts = await Promise.all(errorElements.map(el => el.evaluate(e => e.textContent)));
    console.log('Error elements found:', errorTexts.filter(text => text && text.length > 0));
    
    // Check for loading indicators
    const loadingElements = await page.$$('[class*="loading"], [class*="Loading"], .animate-spin');
    console.log('Loading elements found:', loadingElements.length);
    
    // Check for any text content
    const allText = await page.evaluate(() => document.body.textContent);
    console.log('Page content preview:', allText.substring(0, 500));
    
    // Check for specific elements
    const h1Elements = await page.$$('h1');
    const h1Texts = await Promise.all(h1Elements.map(el => el.evaluate(e => e.textContent)));
    console.log('H1 elements:', h1Texts);
    
    const h2Elements = await page.$$('h2');
    const h2Texts = await Promise.all(h2Elements.map(el => el.evaluate(e => e.textContent)));
    console.log('H2 elements:', h2Texts);
    
    // Check for buttons
    const buttons = await page.$$('button');
    const buttonTexts = await Promise.all(buttons.map(btn => btn.evaluate(el => el.textContent)));
    console.log('Button texts:', buttonTexts.filter(text => text && text.length > 0));
    
    // Check for any cards or content containers
    const cards = await page.$$('[class*="card"], [class*="Card"]');
    console.log('Card elements found:', cards.length);
    
    // Check network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('API requests made:', requests);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testPublicAccess();
