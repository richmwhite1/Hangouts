const { PrismaClient } = require('@prisma/client');

async function testHangoutsAPIServer() {
  const db = new PrismaClient();
  
  try {
    console.log('Testing hangouts API server-side...');
    
    // Test the exact same operations the API does
    const testData = {
      title: 'Test Server Hangout',
      description: 'This is a test hangout created server-side',
      privacyLevel: 'PUBLIC',
      type: 'multi_option',
      participants: [],
      options: [
        {
          id: 'opt1',
          title: 'Option 1',
          description: 'First option',
          location: 'Location 1',
          dateTime: new Date().toISOString(),
          price: 0
        },
        {
          id: 'opt2',
          title: 'Option 2',
          description: 'Second option',
          location: 'Location 2',
          dateTime: new Date().toISOString(),
          price: 0
        }
      ]
    };
    
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    // Test Zod validation
    const { z } = require('zod');
    const createHangoutSchema = z.object({
      title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
      description: z.string().max(500, 'Description too long').optional(),
      location: z.string().max(200, 'Location too long').optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      startTime: z.string().datetime('Invalid start time').optional(),
      endTime: z.string().datetime('Invalid end time').optional(),
      privacyLevel: z.enum(['PRIVATE', 'FRIENDS_ONLY', 'PUBLIC']).default('PUBLIC'),
      maxParticipants: z.number().min(2, 'Must allow at least 2 participants').max(100, 'Too many participants').optional(),
      weatherEnabled: z.boolean().default(false),
      image: z.string().optional(),
      participants: z.array(z.string()).optional(),
      mandatoryParticipants: z.array(z.string()).optional(),
      coHosts: z.array(z.string()).optional(),
      consensusPercentage: z.number().min(50).max(100).optional().default(70),
      type: z.enum(['quick_plan', 'multi_option']).default('multi_option'),
      options: z.array(z.object({
        id: z.string().optional(),
        title: z.string().min(1, 'Option title is required'),
        description: z.string().optional(),
        location: z.string().optional(),
        dateTime: z.string().optional(),
        price: z.number().optional(),
        hangoutUrl: z.string().optional()
      })).optional()
    });
    
    console.log('Testing Zod validation...');
    const validatedData = createHangoutSchema.parse(testData);
    console.log('✅ Zod validation passed');
    
    // Test database operations
    const testUser = await db.user.create({
      data: {
        id: 'test_user_server_' + Date.now(),
        clerkId: 'test_clerk_server_' + Date.now(),
        email: 'testserver@example.com',
        username: 'testuserserver_' + Date.now(),
        name: 'Test Server User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Test user created:', testUser.id);
    
    const startTime = new Date(validatedData.options[0].dateTime);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
    
    const hangout = await db.content.create({
      data: {
        id: 'test_hangout_server_' + Date.now(),
        type: 'HANGOUT',
        title: validatedData.title,
        description: validatedData.description,
        status: 'PUBLISHED',
        privacyLevel: validatedData.privacyLevel,
        creatorId: testUser.id,
        startTime,
        endTime,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Test hangout created:', hangout.id);
    
    // Clean up
    await db.content.delete({ where: { id: hangout.id } });
    await db.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 Server-side test PASSED!');
    
  } catch (error) {
    console.error('❌ Server-side test FAILED:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

testHangoutsAPIServer();
