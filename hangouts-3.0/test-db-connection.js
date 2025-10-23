#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');

  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Test simple query
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);

    // Test hangout count
    const hangoutCount = await prisma.content.count({
      where: { type: 'HANGOUT' }
    });
    console.log(`🏠 Hangouts in database: ${hangoutCount}`);

    // Test specific hangout query
    const testHangoutId = 'hangout_1759601089881_btpk0an6h';
    const hangoutExists = await prisma.content.findUnique({
      where: { 
        id: testHangoutId,
        type: 'HANGOUT'
      },
      select: { id: true, status: true, title: true }
    });

    if (hangoutExists) {
      console.log(`✅ Test hangout found: ${hangoutExists.title}`);
    } else {
      console.log(`❌ Test hangout ${testHangoutId} not found`);
    }

    // Test existing hangout
    const existingHangoutId = 'hangout_1759791292472_zlwy0rj6k';
    const existingHangout = await prisma.content.findUnique({
      where: { 
        id: existingHangoutId,
        type: 'HANGOUT'
      },
      select: { id: true, status: true, title: true }
    });

    if (existingHangout) {
      console.log(`✅ Existing hangout found: ${existingHangout.title}`);
    } else {
      console.log(`❌ Existing hangout ${existingHangoutId} not found`);
    }

    // Test complex query (like in the API)
    console.log('🔍 Testing complex query...');
    const complexHangout = await prisma.content.findUnique({
      where: { 
        id: existingHangoutId,
        type: 'HANGOUT'
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        content_participants: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (complexHangout) {
      console.log(`✅ Complex query successful: ${complexHangout.title}`);
      console.log(`   Participants: ${complexHangout.content_participants.length}`);
    } else {
      console.log('❌ Complex query failed');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
















