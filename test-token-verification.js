#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Test token verification
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWdjcWVybW8wMDAwanBlaWw4aTJrcnoyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzU5Njg4MjM3LCJleHAiOjE3NjAyOTMwMzd9.uwctBxwrD1j0YMF_Iyn0kb7R-pEdlo6fB_n9CxPpLu4';

console.log('Testing token verification...');

try {
  const decoded = jwt.verify(testToken, 'fallback-secret');
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}

// Test with the old secret
try {
  const decoded = jwt.verify(testToken, 'your-secret-key');
  console.log('✅ Token verification with old secret successful:', decoded);
} catch (error) {
  console.log('❌ Token verification with old secret failed:', error.message);
}
