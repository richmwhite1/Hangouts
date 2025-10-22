#!/usr/bin/env node

const http = require('http');

// Create a test user and get token
const createTestUser = async () => {
  console.log('👤 Creating test user...');
  
  const userData = JSON.stringify({
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(userData)
    }
  };
  
  try {
    const result = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(userData);
      req.end();
    });
    
    console.log('User creation result:', JSON.stringify(result, null, 2));
    
    if (result.status === 200 || result.status === 201) {
      console.log('✅ Test user created successfully');
      return result.data.token;
    } else {
      console.log('ℹ️ User might already exist, trying to sign in...');
      
      // Try to sign in with the test user
      const signinData = JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      });
      
      const signinOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/signin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(signinData)
        }
      };
      
      const signinResult = await new Promise((resolve, reject) => {
        const req = http.request(signinOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve({ status: res.statusCode, data: response });
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.write(signinData);
        req.end();
      });
      
      console.log('Signin result:', JSON.stringify(signinResult, null, 2));
      
      if (signinResult.status === 200 && signinResult.data.success) {
        console.log('✅ Test user signed in successfully');
        return signinResult.data.token;
      } else {
        throw new Error('Failed to create or sign in test user');
      }
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
};

// Test save functionality with the token
const testSaveWithToken = async (token) => {
  console.log('💾 Testing save functionality with token...');
  
  const saveData = JSON.stringify({
    action: 'save'
  });
  
  const saveOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/content/hangout_1759610814250_boh5ms4gx/save',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(saveData)
    }
  };
  
  try {
    const saveResult = await new Promise((resolve, reject) => {
      const req = http.request(saveOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(saveData);
      req.end();
    });
    
    console.log('Save result:', JSON.stringify(saveResult, null, 2));
    
    if (saveResult.status === 200 && saveResult.data.success) {
      console.log('✅ Save functionality works!');
      return true;
    } else {
      console.log('❌ Save functionality failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Save test failed:', error.message);
    return false;
  }
};

// Run the test
const runTest = async () => {
  try {
    const token = await createTestUser();
    await testSaveWithToken(token);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

runTest();



















