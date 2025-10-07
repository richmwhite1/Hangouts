#!/usr/bin/env node

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';
const TEST_USER_EMAIL = 'richard@example.com';
const TEST_USER_PASSWORD = 'Password1!';

async function testHangoutAPI() {
  console.log('🚀 Testing hangout API with various hangout IDs...');

  try {
    // Test 1: Health Check
    console.log('\n🏥 Test 1: Health Check');
    const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check response:', healthData);

    // Test 2: Sign In to get token
    console.log('\n🔐 Test 2: Sign In');
    const signInResponse = await fetch(`${RAILWAY_APP_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })
    });

    if (!signInResponse.ok) {
      throw new Error('Sign in failed');
    }

    const signInData = await signInResponse.json();
    const token = signInData.token;
    console.log('✅ Sign in successful, got token');

    // Test 3: Test with non-existent hangout ID (the one causing 502 error)
    console.log('\n🔍 Test 3: Test with non-existent hangout ID');
    const nonExistentId = 'hangout_1759601089881_btpk0an6h';
    console.log(`🎯 Testing hangout ID: ${nonExistentId}`);
    
    const nonExistentResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${nonExistentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📊 Response status: ${nonExistentResponse.status}`);
    const nonExistentData = await nonExistentResponse.json();
    console.log('📋 Response data:', nonExistentData);

    if (nonExistentResponse.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent hangout');
    } else {
      console.log('❌ Expected 404 but got different status');
    }

    // Test 4: Test with existing hangout ID
    console.log('\n🔍 Test 4: Test with existing hangout ID');
    const existingId = 'hangout_1759791292472_zlwy0rj6k'; // Coffee Meetup
    console.log(`🎯 Testing hangout ID: ${existingId}`);
    
    const existingResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${existingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📊 Response status: ${existingResponse.status}`);
    
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      console.log('✅ Successfully fetched existing hangout');
      console.log(`📋 Hangout title: ${existingData.hangout?.title || existingData.title || 'No title'}`);
    } else {
      const existingErrorData = await existingResponse.json();
      console.log('❌ Failed to fetch existing hangout');
      console.log('📋 Error data:', existingErrorData);
    }

    // Test 5: Test with invalid hangout ID format
    console.log('\n🔍 Test 5: Test with invalid hangout ID format');
    const invalidId = 'invalid-hangout-id';
    console.log(`🎯 Testing hangout ID: ${invalidId}`);
    
    const invalidResponse = await fetch(`${RAILWAY_APP_URL}/api/hangouts/${invalidId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📊 Response status: ${invalidResponse.status}`);
    const invalidData = await invalidResponse.json();
    console.log('📋 Response data:', invalidData);

    console.log('\n🎉 Hangout API testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testHangoutAPI();
