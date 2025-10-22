const jwt = require('jsonwebtoken');

// Test JWT verification with different secrets
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZxNzVoMnYwMDAwanBmMDh1M2tmaTZiIiwiZW1haWwiOiJiaWxsQGVtYWlsLmNvbSIsInVzZXJuYW1lIjoiYmlsbCIsImlhdCI6MTc1ODU3MDk2MywiZXhwIjoxNzU5MTc1NzYzfQ.NDVcQMwRUT6JHnHtDgQZ9fxcmzNMYHGO5oxxvofH4xE';

const secrets = [
  'your-secret-key-here-replace-in-production',
  'jwt-secret-key',
  'hangout-secret',
  'development-secret',
  'secret',
  'jwt-secret',
  'JWT_SECRET'
];

console.log('🔍 Testing JWT token verification with different secrets...');
console.log('Token:', testToken);

secrets.forEach(secret => {
  try {
    const decoded = jwt.verify(testToken, secret);
    console.log(`✅ Secret "${secret}" works! Decoded:`, decoded);
  } catch (error) {
    console.log(`❌ Secret "${secret}" failed: ${error.message}`);
  }
});

// Also try to decode without verification to see the payload
try {
  const decoded = jwt.decode(testToken);
  console.log('📊 Token payload (decoded without verification):', decoded);
} catch (error) {
  console.log('❌ Failed to decode token:', error.message);
}



























