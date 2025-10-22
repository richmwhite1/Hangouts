const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createHauntedForestTest() {
  try {
    // Find a user to be the creator
    const user = await prisma.users.findFirst()
    if (!user) {
      console.log('No users found')
      return
    }

    const hangout = await prisma.content.upsert({
      where: { id: 'test_haunted_forest' },
      update: {},
      create: {
        id: 'test_haunted_forest',
        type: 'HANGOUT',
        title: 'Haunted Forest - Utah\'s Largest Haunted Attraction',
        description: 'Come check out Haunted Forest - Utah\'s Largest Haunted Attraction hangout!',
        location: 'Utah',
        startTime: new Date('2024-10-31T19:00:00Z'),
        endTime: new Date('2024-10-31T23:00:00Z'),
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: user.id,
        updatedAt: new Date()
      }
    })

    console.log('Created test hangout:', hangout.title)
    console.log('Image URL:', hangout.image)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createHauntedForestTest()

