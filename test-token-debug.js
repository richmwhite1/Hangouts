#!/usr/bin/env node

const http = require('http');
const jwt = require('jsonwebtoken');

// Test token verification with different secrets
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWdjcWVybW8wMDAwanBlaWw4aTJrcnoyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzU5Njg4Mjk5LCJleHAiOjE3NjAyOTMwOTl9.cvJjCMFD2VZL7SkFtj3OsPm4lBge7w6nUr288sHo-Tc';

console.log('Testing token verification with different secrets...');

const secrets = [
  'fallback-secret',
  'your-secret-key',
  'default-secret',
  'hangouts-secret',
  'jwt-secret',
  'secret',
  'test-secret'
];

secrets.forEach(secret => {
  try {
    const decoded = jwt.verify(testToken, secret);
    console.log(`✅ Token verification with '${secret}' successful:`, decoded);
  } catch (error) {
    console.log(`❌ Token verification with '${secret}' failed:`, error.message);
  }
});

// Also test the token without verification to see its content
console.log('\nToken payload (without verification):');
try {
  const decoded = jwt.decode(testToken);
  console.log(decoded);
} catch (error) {
  console.log('Failed to decode token:', error.message);
}
