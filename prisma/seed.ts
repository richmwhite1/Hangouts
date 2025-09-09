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

  if (!user) {
    console.log('No user found, creating one...')
    const hashedPassword = await bcrypt.hash('password123', 10)
    const newUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        password: hashedPassword,
      },
    })
    console.log('Created user:', newUser)
  } else {
    console.log('Using existing user:', user)
  }

  // Create a test hangout
  const hangout = await prisma.hangout.create({
    data: {
      title: 'Coffee Meetup',
      description: 'Let\'s grab coffee together!',
      location: 'Starbucks Downtown',
      startTime: new Date('2024-12-15T10:00:00.000Z'),
      endTime: new Date('2024-12-15T12:00:00.000Z'),
      privacyLevel: 'FRIENDS_ONLY',
      maxParticipants: 5,
      weatherEnabled: false,
      creatorId: user.id,
    },
  })

  console.log('Created hangout:', hangout)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
