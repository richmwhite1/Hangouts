// Create a test user with known credentials
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

async function createTestUser() {
  console.log('👤 Creating test user...\n');

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.email);
      console.log('User ID:', existingUser.id);
      console.log('Username:', existingUser.username);
      return existingUser;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        password: hashedPassword,
        isActive: true,
        isVerified: true,
        role: 'USER'
      }
    });

    console.log('✅ Test user created successfully!');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    console.log('Password: password123');

    return user;

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await db.$disconnect();
  }
}

createTestUser();












