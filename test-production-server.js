// Test production server locally
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing production server locally...\n');

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = '3001';
process.env.HOSTNAME = 'localhost';

// Start the production server
const server = spawn('node', ['server-production.js'], {
  cwd: path.join(__dirname, 'hangouts-3.0'),
  env: { ...process.env }
});

server.stdout.on('data', (data) => {
  console.log(`Server: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`Server Error: ${data}`);
});

// Wait for server to start
setTimeout(async () => {
  try {
    console.log('\n🔍 Testing health check...');
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    
    console.log('Health check response:', data);
    
    if (response.ok && data.status === 'healthy') {
      console.log('✅ Production server is working correctly!');
    } else {
      console.log('❌ Production server health check failed');
    }
  } catch (error) {
    console.error('❌ Error testing production server:', error.message);
  } finally {
    // Kill the server
    server.kill();
    process.exit(0);
  }
}, 10000); // Wait 10 seconds for server to start

// Handle server exit
server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});













