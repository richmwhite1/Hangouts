import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Find existing user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'test@example.com' },
        { username: 'testuser' }
      ]
    }
  })

  let currentUser = user
  if (!currentUser) {
    console.log('No user found, creating one...')
    const hashedPassword = await bcrypt.hash('password123', 10)
    currentUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        password: hashedPassword,
      },
    })
    console.log('Created user:', currentUser)
  } else {
    console.log('Using existing user:', currentUser)
  }

  // Create a second user for testing
  const secondUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'bill@email.com' },
        { username: 'billbev' }
      ]
    }
  })

  let currentUser2 = secondUser
  if (!currentUser2) {
    console.log('No second user found, creating one...')
    const hashedPassword2 = await bcrypt.hash('password123', 10)
    currentUser2 = await prisma.user.create({
      data: {
        email: 'bill@email.com',
        username: 'billbev',
        name: 'Bill Beverly',
        password: hashedPassword2,
      },
    })
    console.log('Created second user:', currentUser2)
  } else {
    console.log('Using existing second user:', currentUser2)
  }

  // Create a test hangout content
  const hangoutContent = await prisma.content.create({
    data: {
      id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'HANGOUT',
      title: 'Coffee Meetup',
      description: 'Let\'s grab coffee together!',
      location: 'Starbucks Downtown',
      startTime: new Date('2024-12-15T10:00:00.000Z'),
      endTime: new Date('2024-12-15T12:00:00.000Z'),
      privacyLevel: 'FRIENDS_ONLY',
      status: 'PUBLISHED',
      creatorId: currentUser.id,
      maxParticipants: 5,
      weatherEnabled: false,
      updatedAt: new Date(),
    },
  })

  console.log('Created hangout content:', hangoutContent)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
