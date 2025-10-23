#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

// Test both local and Railway databases
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db' // Local SQLite database
    }
  }
});

const railwayPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hangouts'
    }
  }
});

async function debugAuthDatabase() {
  console.log('🔍 Debugging authentication database usage...');

  try {
    // Test local database
    console.log('\n1. Testing local database...');
    try {
      await localPrisma.$connect();
      const localUser = await localPrisma.user.findUnique({
        where: { email: 'richard@example.com' },
        select: { id: true, username: true, name: true, email: true }
      });
      
      if (localUser) {
        console.log('✅ Local database - Richard found:', localUser);
      } else {
        console.log('❌ Local database - Richard not found');
      }
    } catch (error) {
      console.log('❌ Local database error:', error.message);
    } finally {
      await localPrisma.$disconnect();
    }

    // Test Railway database
    console.log('\n2. Testing Railway database...');
    try {
      await railwayPrisma.$connect();
      const railwayUser = await railwayPrisma.user.findUnique({
        where: { email: 'richard@example.com' },
        select: { id: true, username: true, name: true, email: true }
      });
      
      if (railwayUser) {
        console.log('✅ Railway database - Richard found:', railwayUser);
      } else {
        console.log('❌ Railway database - Richard not found');
      }
    } catch (error) {
      console.log('❌ Railway database error:', error.message);
    } finally {
      await railwayPrisma.$disconnect();
    }

    // Test the actual authentication API
    console.log('\n3. Testing authentication API...');
    const authResponse = await fetch('https://hangouts-production-adc4.up.railway.app/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'richard@example.com',
        password: 'Password1!'
      })
    });

    console.log('Auth response status:', authResponse.status);
    const authData = await authResponse.json();
    console.log('Auth response data:', authData);

    if (authData.success && authData.data) {
      console.log('✅ Authentication successful');
      console.log('   User ID from API:', authData.data.user?.id);
      console.log('   Username from API:', authData.data.user?.username);
      console.log('   Name from API:', authData.data.user?.name);
      
      // Decode JWT token
      if (authData.token) {
        try {
          const payload = JSON.parse(atob(authData.token.split('.')[1]));
          console.log('   JWT payload:', payload);
          console.log('   User ID from JWT:', payload.userId);
        } catch (error) {
          console.log('   Could not decode JWT token:', error.message);
        }
      }
    } else {
      console.log('❌ Authentication failed:', authData.error || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ Error during auth database debug:', error);
  }
}

debugAuthDatabase();
















