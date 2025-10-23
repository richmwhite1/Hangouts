const puppeteer = require('puppeteer');

async function comprehensiveCreateTest() {
  console.log('🚀 Running comprehensive create page test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  let testResults = {
    pageLoads: false,
    formVisible: false,
    titleInput: false,
    descriptionInput: false,
    submitButton: false,
    formInteraction: false
  };
  
  try {
    // Test 1: Page loads
    console.log('📄 Test 1: Page loads...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const currentUrl = page.url();
    if (currentUrl.includes('/create')) {
      testResults.pageLoads = true;
      console.log('✅ Create page loads correctly');
    } else {
      console.log('❌ Create page failed to load');
    }
    
    // Test 2: Form is visible
    console.log('📝 Test 2: Form is visible...');
    const createForm = await page.$('form');
    if (createForm) {
      testResults.formVisible = true;
      console.log('✅ Create hangout form is visible');
    } else {
      console.log('❌ Create hangout form not found');
    }
    
    // Test 3: Title input
    console.log('📝 Test 3: Title input...');
    const titleInput = await page.$('input[placeholder*="title" i], input[name*="title" i]');
    if (titleInput) {
      testResults.titleInput = true;
      console.log('✅ Title input found');
    } else {
      console.log('❌ Title input not found');
    }
    
    // Test 4: Description input
    console.log('📝 Test 4: Description input...');
    const descriptionInput = await page.$('textarea, input[placeholder*="description" i]');
    if (descriptionInput) {
      testResults.descriptionInput = true;
      console.log('✅ Description input found');
    } else {
      console.log('❌ Description input not found');
    }
    
    // Test 5: Submit button
    console.log('📝 Test 5: Submit button...');
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      testResults.submitButton = true;
      console.log('✅ Submit button found');
    } else {
      console.log('❌ Submit button not found');
    }
    
    // Test 6: Form interaction
    console.log('📝 Test 6: Form interaction...');
    if (titleInput && descriptionInput) {
      await titleInput.type('Test Hangout');
      await descriptionInput.type('This is a test hangout');
      testResults.formInteraction = true;
      console.log('✅ Form interaction works');
    } else {
      console.log('❌ Form interaction failed');
    }
    
    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    console.log(`Page loads: ${testResults.pageLoads ? '✅' : '❌'}`);
    console.log(`Form visible: ${testResults.formVisible ? '✅' : '❌'}`);
    console.log(`Title input: ${testResults.titleInput ? '✅' : '❌'}`);
    console.log(`Description input: ${testResults.descriptionInput ? '✅' : '❌'}`);
    console.log(`Submit button: ${testResults.submitButton ? '✅' : '❌'}`);
    console.log(`Form interaction: ${testResults.formInteraction ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(testResults).every(result => result === true);
    console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 SUCCESS: Create page is working perfectly!');
      console.log('   - Page loads correctly');
      console.log('   - Form is visible and functional');
      console.log('   - All form elements are present');
      console.log('   - Form interaction works');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

comprehensiveCreateTest().catch(console.error);













