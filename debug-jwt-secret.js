#!/usr/bin/env node

/**
 * Debug JWT Secret
 * Check what JWT secret the server is actually using
 */

const jwt = require('jsonwebtoken');

// Test different possible secrets
const possibleSecrets = [
  'your-secret-key',
  'your-super-secret-jwt-key-here-make-it-long-and-random',
  'supersecretjwtkey',
  'your-super-secret-jwt-key-here-make-it-long-and-random',
  process.env.JWT_SECRET
];

const adminPayload = {
  userId: 'admin_1759369247801_pz3lf2nhx',
  email: 'admin@example.com',
  username: 'admin',
  role: 'ADMIN'
};

console.log('🔍 Testing different JWT secrets...\n');

for (const secret of possibleSecrets) {
  if (!secret) continue;
  
  try {
    const token = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
    console.log(`🔑 Secret: ${secret}`);
    console.log(`📝 Token: ${token.substring(0, 50)}...`);
    
    // Test the token with the API
    const response = await fetch('http://localhost:3000/api/admin/import-events', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS! This secret works!`);
      console.log(`📋 Message: ${data.message}`);
      break;
    } else {
      const errorData = await response.json();
      console.log(`❌ Failed: ${errorData.error}`);
    }
    
    console.log('---\n');
    
  } catch (error) {
    console.log(`❌ Error with secret ${secret}: ${error.message}\n`);
  }
}







