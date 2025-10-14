#!/usr/bin/env node

const RAILWAY_APP_URL = 'https://hangouts-production-adc4.up.railway.app';

async function checkRailwayStatus() {
  console.log('🔍 Checking Railway deployment status...');
  console.log(`URL: ${RAILWAY_APP_URL}`);

  try {
    // Test 1: Basic connectivity
    console.log('\n🌐 Test 1: Basic connectivity');
    const response = await fetch(RAILWAY_APP_URL, { 
      method: 'GET',
      timeout: 10000
    });
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 200) {
      const html = await response.text();
      console.log('Response length:', html.length);
      console.log('Contains "Hangouts":', html.includes('Hangouts'));
      console.log('Contains "Next.js":', html.includes('Next.js'));
    }

    // Test 2: Health endpoint
    console.log('\n🏥 Test 2: Health endpoint');
    try {
      const healthResponse = await fetch(`${RAILWAY_APP_URL}/api/health`, {
        timeout: 10000
      });
      console.log('Health response status:', healthResponse.status);
      
      if (healthResponse.status === 200) {
        const healthData = await healthResponse.json();
        console.log('Health data:', healthData);
      } else {
        const healthText = await healthResponse.text();
        console.log('Health error response:', healthText);
      }
    } catch (healthError) {
      console.error('Health endpoint error:', healthError.message);
    }

    // Test 3: API endpoints
    console.log('\n🔌 Test 3: API endpoints');
    const apiEndpoints = [
      '/api/auth/signin',
      '/api/hangouts/test-hangout-123',
      '/api/test-hangouts'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const apiResponse = await fetch(`${RAILWAY_APP_URL}${endpoint}`, {
          method: 'GET',
          timeout: 10000
        });
        console.log(`${endpoint}: ${apiResponse.status}`);
        
        if (apiResponse.status !== 200) {
          const errorText = await apiResponse.text();
          console.log(`  Error: ${errorText.substring(0, 100)}...`);
        }
      } catch (apiError) {
        console.error(`${endpoint}: ${apiError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Railway status check failed:', error.message);
  }
}

checkRailwayStatus();








