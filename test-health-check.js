const http = require('http');

function testHealthCheck() {
  console.log('🏥 Testing health check endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`✅ Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Response:', response);
        
        if (res.statusCode === 200 && response.status === 'ok') {
          console.log('🎉 Health check passed!');
        } else {
          console.log('❌ Health check failed!');
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
  });

  req.end();
}

// Wait a moment for the server to start, then test
setTimeout(testHealthCheck, 2000);