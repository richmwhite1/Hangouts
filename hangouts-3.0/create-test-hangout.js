const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestHangout() {
  try {
    // First, create a test user if it doesn't exist
    let user = await prisma.user.findFirst({
      where: { username: 'testuser' }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: 'test_clerk_id',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          role: 'USER'
        }
      })
      console.log('Created test user:', user.id)
    }

    // Create a test hangout
    const hangout = await prisma.content.create({
      data: {
        id: 'test_hangout_123',
        type: 'HANGOUT',
        title: 'Test Public Hangout',
        description: 'This is a test hangout for sharing and testing public viewing',
        location: 'Test Location, Test City',
        startTime: new Date('2024-12-25T18:00:00Z'),
        endTime: new Date('2024-12-25T22:00:00Z'),
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date()
      }
    })

    console.log('Created test hangout:', hangout.id)
    console.log('Hangout title:', hangout.title)
    console.log('Hangout privacy:', hangout.privacyLevel)
    console.log('Hangout status:', hangout.status)

    // Test the public API query
    const testQuery = await prisma.content.findUnique({
      where: {
        id: 'test_hangout_123',
        type: 'HANGOUT',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC'
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        image: true,
        privacyLevel: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    console.log('Test query result:', testQuery ? 'SUCCESS' : 'FAILED')
    if (testQuery) {
      console.log('Hangout found:', testQuery.title)
      console.log('Creator:', testQuery.users?.name)
    }

  } catch (error) {
    console.error('Error creating test hangout:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestHangout()





