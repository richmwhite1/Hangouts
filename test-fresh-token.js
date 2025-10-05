#!/usr/bin/env node

const http = require('http');
const jwt = require('jsonwebtoken');

// Get a fresh token
const getFreshToken = async () => {
  const signinData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(signinData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.token) {
            resolve(response.data.token);
          } else {
            reject(new Error('Failed to get token: ' + JSON.stringify(response)));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(signinData);
    req.end();
  });
};

// Test token verification
const testTokenVerification = async () => {
  try {
    const token = await getFreshToken();
    console.log('Fresh token:', token.substring(0, 50) + '...');
    
    // Test with fallback-secret
    try {
      const decoded = jwt.verify(token, 'fallback-secret');
      console.log('✅ Token verification with fallback-secret successful:', decoded);
    } catch (error) {
      console.log('❌ Token verification with fallback-secret failed:', error.message);
    }
    
    // Test with your-secret-key
    try {
      const decoded = jwt.verify(token, 'your-secret-key');
      console.log('✅ Token verification with your-secret-key successful:', decoded);
    } catch (error) {
      console.log('❌ Token verification with your-secret-key failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testTokenVerification();
