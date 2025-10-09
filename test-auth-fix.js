const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

// Use production database URL for Railway
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hangouts'
    }
  }
});

async function testAuthFix() {
  console.log(`🚀 Testing authentication fix at: ${RAILWAY_APP_URL}`);

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

    // Test 3: Check Auth Token
    console.log('\n🔍 Test 3: Check Auth Token');
    
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
    
    if (!token) {
      throw new Error('No auth token found in localStorage');
    }
    
    console.log('Auth token found, length:', token.length);

    // Decode the JWT token to see what user ID it contains
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload:', payload);
      console.log('User ID from JWT:', payload.userId);
    } catch (error) {
      console.log('Could not decode JWT token:', error.message);
    }

    // Test 4: Check Database User
    console.log('\n🔍 Test 4: Check Database User');
    
    const richardUser = await prisma.user.findUnique({
      where: { email: 'richard@example.com' },
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    });

    if (richardUser) {
      console.log('✅ Richard user found in database:', richardUser);
    } else {
      console.log('❌ Richard user not found in database');
    }

    // Test 5: Create Hangout with Correct User ID
    console.log('\n🏠 Test 5: Create Hangout with Correct User ID');
    
    const hangoutData = {
      title: 'Auth Fix Test Hangout ' + Date.now(),
      description: 'Testing hangout creation with correct user ID',
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

    console.log('Creating hangout with data:', JSON.stringify(hangoutData, null, 2));

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

    if (createResponse.status === 200 || createResponse.status === 201) {
      console.log('✅ Hangout created successfully!');
      console.log('   Hangout ID:', createData.data?.id);
      console.log('   State:', createData.data?.state);
      console.log('   Requires Voting:', createData.data?.requiresVoting);
      console.log('   Options Count:', createData.data?.options?.length);

      // Check if poll was created
      const hangoutId = createData.data?.id;
      if (hangoutId) {
        console.log('\n🔍 Test 6: Check Poll Creation');
        
        // Wait a moment for poll creation
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
          console.log('✅ Poll created successfully!');
          console.log('   Poll ID:', poll.id);
          console.log('   Status:', poll.status);
          console.log('   Options:', poll.options);
          console.log('   Votes count:', poll.votes.length);
        } else {
          console.log('❌ No poll found in database');
        }
      }
    } else {
      console.log('❌ Hangout creation failed:', createData.error || 'Unknown error');
    }

    console.log('\n🎉 Auth fix test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

testAuthFix();


