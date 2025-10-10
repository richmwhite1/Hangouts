#!/usr/bin/env node

/**
 * Railway Deployment Script with Clerk Authentication
 * Automates the deployment process to Railway
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

console.log('🚀 Railway Deployment Script');
console.log('============================\n');

async function main() {
  try {
    // Step 1: Check if Railway CLI is installed
    console.log('1. Checking Railway CLI...');
    try {
      execSync('railway --version', { stdio: 'pipe' });
      console.log('✅ Railway CLI is installed');
    } catch (error) {
      console.log('❌ Railway CLI not found. Installing...');
      execSync('npm install -g @railway/cli', { stdio: 'inherit' });
      console.log('✅ Railway CLI installed');
    }

    // Step 2: Check if user is logged in
    console.log('\n2. Checking Railway authentication...');
    try {
      execSync('railway whoami', { stdio: 'pipe' });
      console.log('✅ Logged in to Railway');
    } catch (error) {
      console.log('❌ Not logged in to Railway');
      const login = await question('Do you want to login to Railway? (y/n): ');
      if (login.toLowerCase() === 'y') {
        execSync('railway login', { stdio: 'inherit' });
        console.log('✅ Logged in to Railway');
      } else {
        console.log('❌ Please login to Railway first: railway login');
        process.exit(1);
      }
    }

    // Step 3: Check environment variables
    console.log('\n3. Checking environment variables...');
    const envFile = '.env.local';
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      if (envContent.includes('pk_test_placeholder') || envContent.includes('sk_test_placeholder')) {
        console.log('⚠️  WARNING: Using placeholder Clerk keys');
        console.log('📝 Please update .env.local with real Clerk keys before deploying');
        const proceed = await question('Do you want to proceed anyway? (y/n): ');
        if (proceed.toLowerCase() !== 'y') {
          console.log('❌ Deployment cancelled. Please update Clerk keys first.');
          process.exit(1);
        }
      } else {
        console.log('✅ Environment variables look good');
      }
    } else {
      console.log('❌ No .env.local file found');
      process.exit(1);
    }

    // Step 4: Build the application
    console.log('\n4. Building application...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build successful');
    } catch (error) {
      console.log('❌ Build failed');
      process.exit(1);
    }

    // Step 5: Initialize Railway project (if needed)
    console.log('\n5. Checking Railway project...');
    try {
      execSync('railway status', { stdio: 'pipe' });
      console.log('✅ Railway project already initialized');
    } catch (error) {
      console.log('❌ No Railway project found');
      const init = await question('Do you want to initialize a new Railway project? (y/n): ');
      if (init.toLowerCase() === 'y') {
        execSync('railway init', { stdio: 'inherit' });
        console.log('✅ Railway project initialized');
      } else {
        console.log('❌ Please initialize Railway project first: railway init');
        process.exit(1);
      }
    }

    // Step 6: Set environment variables
    console.log('\n6. Setting environment variables...');
    const setEnvVar = async (key, value) => {
      try {
        execSync(`railway variables set ${key}="${value}"`, { stdio: 'pipe' });
        console.log(`✅ Set ${key}`);
      } catch (error) {
        console.log(`❌ Failed to set ${key}`);
      }
    };

    // Read environment variables from .env.local
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/"/g, '');
        if (key && value && !value.includes('placeholder')) {
          await setEnvVar(key.trim(), value.trim());
        }
      }
    }

    // Step 7: Deploy to Railway
    console.log('\n7. Deploying to Railway...');
    try {
      execSync('railway up', { stdio: 'inherit' });
      console.log('✅ Deployment successful!');
    } catch (error) {
      console.log('❌ Deployment failed');
      process.exit(1);
    }

    // Step 8: Get deployment URL
    console.log('\n8. Getting deployment URL...');
    try {
      const url = execSync('railway domain', { stdio: 'pipe' }).toString().trim();
      console.log(`🌐 Your app is deployed at: https://${url}`);
      console.log('\n📋 Next steps:');
      console.log('1. Test the authentication flow');
      console.log('2. Configure Clerk production instance');
      console.log('3. Update OAuth redirect URLs');
      console.log('4. Set up custom domain (optional)');
    } catch (error) {
      console.log('❌ Could not get deployment URL');
    }

    console.log('\n🎉 Deployment completed successfully!');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
