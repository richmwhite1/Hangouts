const puppeteer = require('puppeteer');

async function testBothPages() {
  console.log('🚀 Testing both create and friends pages...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  let testResults = {
    createPageLoads: false,
    createFormVisible: false,
    friendsPageLoads: false,
    friendsTabsVisible: false,
    noDuplicateNav: false
  };
  
  try {
    // Test 1: Create page
    console.log('➕ Test 1: Create page...');
    await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const createUrl = page.url();
    if (createUrl.includes('/create')) {
      testResults.createPageLoads = true;
      console.log('✅ Create page loads correctly');
      
      const createForm = await page.$('form');
      if (createForm) {
        testResults.createFormVisible = true;
        console.log('✅ Create form is visible');
      } else {
        console.log('❌ Create form not found');
      }
    } else {
      console.log('❌ Create page failed to load');
    }
    
    // Test 2: Friends page
    console.log('👥 Test 2: Friends page...');
    await page.goto('http://localhost:3000/friends', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const friendsUrl = page.url();
    if (friendsUrl.includes('/friends')) {
      testResults.friendsPageLoads = true;
      console.log('✅ Friends page loads correctly');
      
      const friendsTabs = await page.$('[role="tablist"]');
      if (friendsTabs) {
        testResults.friendsTabsVisible = true;
        console.log('✅ Friends tabs are visible');
      } else {
        console.log('❌ Friends tabs not found');
      }
    } else {
      console.log('❌ Friends page failed to load');
    }
    
    // Test 3: Check for duplicate navigation
    console.log('🔍 Test 3: Check for duplicate navigation...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const navElements = await page.$$('nav');
    if (navElements.length === 1) {
      testResults.noDuplicateNav = true;
      console.log('✅ No duplicate navigation bars');
    } else {
      console.log(`❌ Found ${navElements.length} navigation bars (should be 1)`);
    }
    
    // Test 4: Check profile picture
    console.log('👤 Test 4: Check profile picture...');
    const profileAvatar = await page.$('nav [data-testid="avatar"], nav .avatar, nav img[alt*="Profile"]');
    if (profileAvatar) {
      const avatarSrc = await profileAvatar.evaluate(el => el.src || el.getAttribute('src'));
      if (avatarSrc && !avatarSrc.includes('placeholder')) {
        console.log('✅ Profile picture is showing');
      } else {
        console.log('⚠️ Profile picture is placeholder (user may not have set one)');
      }
    } else {
      console.log('❌ Profile avatar not found');
    }
    
    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    console.log(`Create page loads: ${testResults.createPageLoads ? '✅' : '❌'}`);
    console.log(`Create form visible: ${testResults.createFormVisible ? '✅' : '❌'}`);
    console.log(`Friends page loads: ${testResults.friendsPageLoads ? '✅' : '❌'}`);
    console.log(`Friends tabs visible: ${testResults.friendsTabsVisible ? '✅' : '❌'}`);
    console.log(`No duplicate nav: ${testResults.noDuplicateNav ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(testResults).every(result => result === true);
    console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 SUCCESS: Both pages are working correctly!');
      console.log('   - Create page loads and form is visible');
      console.log('   - Friends page loads and tabs are visible');
      console.log('   - No duplicate navigation bars');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testBothPages().catch(console.error);












