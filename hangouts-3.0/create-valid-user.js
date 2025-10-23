const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function createValidUser() {
  try {
    console.log('🔧 Creating valid user for testing...\n');

    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'karl@email.com',
        username: 'karl',
        name: 'Karl Test User',
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Created user: ${user.username} (${user.id})`);

    // Generate a JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Generated token: ${token.substring(0, 50)}...`);
    console.log(`\n🔑 Use this token for frontend authentication: ${token}`);
    console.log(`🆔 User ID: ${user.id}`);

  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createValidUser();



























