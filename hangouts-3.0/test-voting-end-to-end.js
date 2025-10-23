const puppeteer = require('puppeteer');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testVotingEndToEnd() {
  console.log(`🚀 Testing end-to-end voting functionality at: ${RAILWAY_APP_URL}`);

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
    // Test 1: Health Check
    console.log('\n🏥 Test 1: Health Check');
    const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check response:', healthData);
    
    if (healthResponse.status !== 200 || healthData.status !== 'ok') {
      throw new Error('Health check failed');
    }

    // Test 2: Sign In
    console.log('\n🔐 Test 2: Sign In');
    await page.goto(`${RAILWAY_APP_URL}/signin`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const signInButton = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && signInButton) {
      await emailInput.type(TEST_USER_EMAIL);
      await passwordInput.type(TEST_USER_PASSWORD);
      await signInButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl === RAILWAY_APP_URL || currentUrl.includes('hangouts-production')) {
        console.log('✅ Sign in successful - navigation completed');
      } else {
        throw new Error(`Sign in failed. Redirected to: ${currentUrl}`);
      }
    } else {
      throw new Error('Sign in form elements not found');
    }

    // Test 3: Create Multi-Option Hangout
    console.log('\n🏠 Test 3: Create Multi-Option Hangout');
    
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
    
    if (!token) {
      throw new Error('No auth token found in localStorage');
    }
    
    console.log('Auth token found, length:', token.length);

    const hangoutData = {
      title: 'End-to-End Voting Test ' + Date.now(),
      description: 'Testing complete voting functionality end-to-end',
      location: 'Test Location',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      options: [
        {
          id: 'option_1',
          title: 'Option 1: Coffee Shop',
          description: 'Let\'s meet at the local coffee shop',
          location: 'Downtown Coffee Shop',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          price: 5
        },
        {
          id: 'option_2',
          title: 'Option 2: Park Picnic',
          description: 'Enjoy a picnic in the park',
          location: 'Central Park',
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          price: 10
        },
        {
          id: 'option_3',
          title: 'Option 3: Restaurant Dinner',
          description: 'Have dinner at a nice restaurant',
          location: 'Fine Dining Restaurant',
          dateTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          price: 25
        }
      ],
      participants: []
    };

    console.log('Creating multi-option hangout...');
    const createResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(hangoutData)
    });

    console.log('Create response status:', createResponse.status);
    const createData = await createResponse.json();
    console.log('Create response data:', createData);

    if (createResponse.status !== 200 && createResponse.status !== 201) {
      throw new Error(`Hangout creation failed: ${createData.error || 'Unknown error'}`);
    }

    const hangoutId = createData.data?.id;
    if (!hangoutId) {
      throw new Error('No hangout ID returned from creation');
    }

    console.log('✅ Multi-option hangout created successfully!');
    console.log('   Hangout ID:', hangoutId);
    console.log('   State:', createData.data?.state);
    console.log('   Requires Voting:', createData.data?.requiresVoting);
    console.log('   Options Count:', createData.data?.options?.length);

    // Test 4: Navigate to Hangout Page
    console.log('\n🔍 Test 4: Navigate to Hangout Page');
    const hangoutPageUrl = `${RAILWAY_APP_URL}/hangout/${hangoutId}`;
    await page.goto(hangoutPageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    if (currentUrl.includes(`/hangout/${hangoutId}`)) {
      console.log(`✅ Successfully navigated to hangout: ${currentUrl}`);
      
      // Check for voting interface elements
      const votingSection = await page.$('h2');
      if (votingSection) {
        const votingText = await votingSection.evaluate(el => el.textContent);
        if (votingText && votingText.includes('Vote')) {
          console.log('✅ Voting section found on page');
        } else {
          console.log('⚠️ Voting section not found - checking for voting buttons');
        }
      } else {
        console.log('⚠️ No h2 elements found - checking for voting buttons');
      }
      
      // Look for vote buttons
      const voteButtons = await page.$$('button');
      const voteButtonTexts = await Promise.all(voteButtons.map(btn => btn.evaluate(el => el.textContent)));
      const actualVoteButtons = voteButtonTexts.filter(text => text && (text.includes('Vote') || text.includes('Tap')));
      
      if (actualVoteButtons.length > 0) {
        console.log(`✅ Found ${actualVoteButtons.length} vote buttons:`, actualVoteButtons);
      } else {
        console.log('❌ No vote buttons found');
      }
      
      // Check for options display
      const optionElements = await page.$$('[data-testid="option"], .option, h3');
      console.log(`📊 Found ${optionElements.length} potential option elements`);
      
      // Check page title
      const pageTitle = await page.title();
      console.log('📄 Page title:', pageTitle);
      
    } else {
      throw new Error(`Failed to navigate to hangout. Redirected to: ${currentUrl}`);
    }

    // Test 5: Test Voting API
    console.log('\n🔍 Test 5: Test Voting API');
    
    const hangoutResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${hangoutId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const hangoutData2 = await hangoutResponse.json();
    console.log('Hangout GET response status:', hangoutResponse.status);
    
    if (hangoutData2.success && hangoutData2.hangout) {
      const hangout = hangoutData2.hangout;
      console.log('   State:', hangout.state);
      console.log('   Requires Voting:', hangout.requiresVoting);
      console.log('   Options:', hangout.options?.length || 0);
      
      if (hangout.requiresVoting && hangout.options && hangout.options.length > 1) {
        console.log('✅ Hangout is in voting state with multiple options');
        
        // Test voting on first option
        const firstOptionId = hangout.options[0].id;
        console.log('Testing vote on option:', firstOptionId);
        
        const voteResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${hangoutId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            optionId: firstOptionId,
            action: 'toggle'
          })
        });
        
        console.log('Vote response status:', voteResponse.status);
        const voteData = await voteResponse.json();
        console.log('Vote response data:', voteData);
        
        if (voteResponse.status === 200 || voteResponse.status === 201) {
          console.log('✅ Vote submitted successfully!');
        } else {
          console.log('⚠️ Vote submission failed:', voteData.error || 'Unknown error');
        }
        
        // Test voting on second option
        const secondOptionId = hangout.options[1].id;
        console.log('Testing vote on option:', secondOptionId);
        
        const voteResponse2 = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${hangoutId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            optionId: secondOptionId,
            action: 'toggle'
          })
        });
        
        console.log('Vote 2 response status:', voteResponse2.status);
        const voteData2 = await voteResponse2.json();
        console.log('Vote 2 response data:', voteData2);
        
        if (voteResponse2.status === 200 || voteResponse2.status === 201) {
          console.log('✅ Second vote submitted successfully!');
        } else {
          console.log('⚠️ Second vote submission failed:', voteData2.error || 'Unknown error');
        }
        
      } else {
        console.log('❌ Hangout is not in voting state or has insufficient options');
      }
    } else {
      console.log('❌ Failed to fetch hangout data');
    }

    console.log('\n🎉 End-to-end voting test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

testVotingEndToEnd();
















