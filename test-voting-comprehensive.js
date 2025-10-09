const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

const prisma = new PrismaClient();

async function testVotingComprehensive() {
  console.log(`🚀 Comprehensive voting system test at: ${RAILWAY_APP_URL}`);

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
    
    // Get the auth token from localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
    
    if (!token) {
      throw new Error('No auth token found in localStorage');
    }
    
    console.log('Auth token found, length:', token.length);

    // Create a multi-option hangout
    const hangoutData = {
      title: 'Comprehensive Voting Test ' + Date.now(),
      description: 'Testing complete voting functionality',
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

    // Test 4: Check Database for Poll Creation
    console.log('\n🔍 Test 4: Check Database for Poll Creation');
    
    // Wait a moment for the poll to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const polls = await prisma.polls.findMany({
      where: { contentId: hangoutId },
      include: {
        votes: true
      }
    });

    console.log('📊 Polls found in database:', polls.length);
    
    if (polls.length > 0) {
      const poll = polls[0];
      console.log('✅ Poll found in database!');
      console.log('   Poll ID:', poll.id);
      console.log('   Status:', poll.status);
      console.log('   Options (JSON):', poll.options);
      console.log('   Votes count:', poll.votes.length);
      console.log('   Expires at:', poll.expiresAt);
      
      if (Array.isArray(poll.options)) {
        console.log('   Options array length:', poll.options.length);
        poll.options.forEach((option, index) => {
          console.log(`     Option ${index + 1}:`, {
            id: option.id,
            title: option.title,
            description: option.description
          });
        });
      } else {
        console.log('❌ Options is not an array:', typeof poll.options);
      }
    } else {
      console.log('❌ No poll found in database for hangout:', hangoutId);
      
      // Check all recent polls
      const allPolls = await prisma.polls.findMany({
        select: {
          id: true,
          contentId: true,
          status: true,
          options: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      console.log('📊 Recent polls in database:', allPolls.length);
      allPolls.forEach((poll, index) => {
        console.log(`   Poll ${index + 1}:`, {
          id: poll.id,
          contentId: poll.contentId,
          status: poll.status,
          optionsCount: Array.isArray(poll.options) ? poll.options.length : 'Not array',
          createdAt: poll.createdAt
        });
      });
    }

    // Test 5: Test Hangout GET API
    console.log('\n🔍 Test 5: Test Hangout GET API');
    
    const hangoutResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${hangoutId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const hangoutData2 = await hangoutResponse.json();
    console.log('Hangout GET response status:', hangoutResponse.status);
    console.log('Hangout data:', hangoutData2);
    
    if (hangoutData2.success && hangoutData2.hangout) {
      const hangout = hangoutData2.hangout;
      console.log('   State:', hangout.state);
      console.log('   Requires Voting:', hangout.requiresVoting);
      console.log('   Options:', hangout.options?.length || 0);
      
      if (hangout.requiresVoting && hangout.options && hangout.options.length > 1) {
        console.log('✅ Hangout is in voting state with multiple options');
      } else {
        console.log('❌ Hangout is not in voting state or has insufficient options');
      }
    } else {
      console.log('❌ Failed to fetch hangout data');
    }

    console.log('\n🎉 Comprehensive voting test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

testVotingComprehensive();


