const puppeteer = require('puppeteer');

async function runTest() {
  const browser = await puppeteer.launch({ 
    headless: true, // Run headless for speed
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  let results = {
    home: false,
    signin: false,
    friendsRedirect: false,
    createRedirect: false
  };
  
  try {
    // Test home page
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    results.home = (await page.title()) === 'Hangouts 3.0';
    
    // Test signin page
    await page.goto('http://localhost:3000/signin', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    results.signin = page.url().includes('/signin');
    
    // Test friends redirect
    await page.goto('http://localhost:3000/friends', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    results.friendsRedirect = page.url().includes('/signin');
    
    // Test create redirect
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    results.createRedirect = page.url().includes('/signin');
    
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  return results;
}

async function runTenTests() {
  console.log('🚀 Running 10 comprehensive tests...\n');
  
  const allResults = [];
  
  for (let i = 1; i <= 10; i++) {
    console.log(`📋 Test ${i}/10...`);
    const results = await runTest();
    allResults.push(results);
    
    const passed = Object.values(results).every(r => r === true);
    console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!passed) {
      console.log(`   Details: Home=${results.home}, Signin=${results.signin}, Friends=${results.friendsRedirect}, Create=${results.createRedirect}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 FINAL RESULTS:');
  console.log('================');
  
  const passedTests = allResults.filter(results => Object.values(results).every(r => r === true));
  const failedTests = allResults.filter(results => !Object.values(results).every(r => r === true));
  
  console.log(`✅ Passed: ${passedTests.length}/10`);
  console.log(`❌ Failed: ${failedTests.length}/10`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach((results, index) => {
      const testNumber = allResults.indexOf(results) + 1;
      console.log(`   Test ${testNumber}: Home=${results.home}, Signin=${results.signin}, Friends=${results.friendsRedirect}, Create=${results.createRedirect}`);
    });
  }
  
  if (passedTests.length === 10) {
    console.log('\n🎉 SUCCESS: All 10 tests passed!');
    console.log('   The app is working correctly and consistently!');
  } else {
    console.log('\n⚠️  WARNING: Some tests failed. The app may have intermittent issues.');
  }
}

runTenTests().catch(console.error);












