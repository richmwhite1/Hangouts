#!/usr/bin/env node

const http = require('http');

const testHealthCheck = (port = 3000, host = 'localhost') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: '/api/health',
      method: 'GET',
      timeout: 10000
    };

    console.log(`🏥 Testing health check at http://${host}:${port}/api/health`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Health check response:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200 && response.status === 'healthy') {
            console.log('✅ Health check PASSED');
            resolve(response);
          } else {
            console.log('❌ Health check FAILED - Status:', res.statusCode, 'Response:', response.status);
            reject(new Error(`Health check failed: ${res.statusCode} - ${response.status}`));
          }
        } catch (parseError) {
          console.log('❌ Failed to parse health check response:', data);
          reject(parseError);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Health check request failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.log('❌ Health check request timed out');
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.end();
  });
};

// Test local health check
testHealthCheck()
  .then(() => {
    console.log('🎉 All health checks passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Health check failed:', error.message);
    process.exit(1);
  });
