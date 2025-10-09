#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Clerk Authentication Setup');
console.log('============================\n');

console.log('To complete the setup, you need to:');
console.log('1. Go to https://clerk.com');
console.log('2. Sign up for a free account');
console.log('3. Create a new application: "Hangout App"');
console.log('4. Select "Google" as authentication method');
console.log('5. Copy your keys and add them to your environment\n');

console.log('Environment variables needed:');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...');
console.log('CLERK_SECRET_KEY=sk_test_...\n');

console.log('For Railway deployment, add these to your Railway environment variables:');
console.log('- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
console.log('- CLERK_SECRET_KEY\n');

console.log('Once you have the keys, create a .env.local file with:');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key_here');
console.log('CLERK_SECRET_KEY=your_secret_key_here\n');

console.log('Then run: npm run dev');
console.log('And visit http://localhost:3000 to test the authentication!');




