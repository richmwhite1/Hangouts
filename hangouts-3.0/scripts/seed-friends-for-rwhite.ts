import { PrismaClient } from '@prisma/client'
import { logger } from '../src/lib/logger'

const prisma = new PrismaClient()

const testUsers = [
  {
    email: 'alice@test.com',
    username: 'alice',
    name: 'Alice Johnson',
    bio: 'Love hiking and coffee! ☕️',
    location: 'San Francisco, CA',
    avatar: null
  },
  {
    email: 'bob@test.com',
    username: 'bob',
    name: 'Bob Smith',
    bio: 'Photographer and traveler 📸',
    location: 'New York, NY',
    avatar: null
  },
  {
    email: 'charlie@test.com',
    username: 'charlie',
    name: 'Charlie Brown',
    bio: 'Foodie and chef 🍳',
    location: 'Los Angeles, CA',
    avatar: null
  },
  {
    email: 'diana@test.com',
    username: 'diana',
    name: 'Diana Prince',
    bio: 'Yoga instructor and wellness coach 🧘',
    location: 'Seattle, WA',
    avatar: null
  },
  {
    email: 'eve@test.com',
    username: 'eve',
    name: 'Eve Martinez',
    bio: 'Musician and music lover 🎵',
    location: 'Austin, TX',
    avatar: null
  }
]

async function main() {
  try {
    logger.info('Starting seed script to create friends for rwhite...')

    // Find rwhite user
    const rwhite = await prisma.user.findUnique({
      where: { username: 'rwhite' }
    })

    if (!rwhite) {
      logger.error('User @rwhite not found in database!')
      logger.info('Please make sure you are logged in as @rwhite first')
      process.exit(1)
    }

    logger.info(`Found user @rwhite with ID: ${rwhite.id}`)

    // Create test users
    const createdUsers = []
    for (const userData of testUsers) {
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: userData.email }
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            name: userData.name,
            bio: userData.bio,
            location: userData.location,
            avatar: userData.avatar,
            isActive: true,
            isVerified: false
          }
        })
        logger.info(`Created user: ${user.username} (${user.name})`)
      } else {
        logger.info(`User already exists: ${user.username} (${user.name})`)
      }
      createdUsers.push(user)
    }

    // Create friendships between rwhite and test users
    logger.info('Creating friendships...')
    for (const friend of createdUsers) {
      // Check if friendship already exists
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: rwhite.id, friendId: friend.id },
            { userId: friend.id, friendId: rwhite.id }
          ],
          status: 'ACTIVE'
        }
      })

      if (existingFriendship) {
        logger.info(`Friendship already exists between @rwhite and @${friend.username}`)
        continue
      }

      // Create bidirectional friendships
      await prisma.friendship.createMany({
        data: [
          {
            userId: rwhite.id,
            friendId: friend.id,
            status: 'ACTIVE'
          },
          {
            userId: friend.id,
            friendId: rwhite.id,
            status: 'ACTIVE'
          }
        ],
        skipDuplicates: true
      })

      logger.info(`Created friendship between @rwhite and @${friend.username}`)
    }

    // Create some sample hangouts between rwhite and friends (optional, for testing stats)
    logger.info('Creating sample hangouts...')
    const alice = createdUsers.find(u => u.username === 'alice')
    const bob = createdUsers.find(u => u.username === 'bob')

    if (alice) {
      // Create a hangout with Alice from 2 weeks ago
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const hangoutWithAlice = await prisma.content.create({
        data: {
          type: 'HANGOUT',
          title: 'Coffee at Blue Bottle',
          description: 'Great coffee and conversation!',
          status: 'PUBLISHED',
          startTime: twoWeeksAgo,
          endTime: new Date(twoWeeksAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          venue: 'Blue Bottle Coffee, San Francisco',
          usersId: rwhite.id,
          createdAt: twoWeeksAgo,
          lastActivityAt: twoWeeksAgo
        }
      })

      // Add participants
      await prisma.content_participants.createMany({
        data: [
          { userId: rwhite.id, contentId: hangoutWithAlice.id },
          { userId: alice.id, contentId: hangoutWithAlice.id }
        ]
      })

      // Add RSVPs
      await prisma.rsvp.createMany({
        data: [
          { userId: rwhite.id, contentId: hangoutWithAlice.id, status: 'YES' },
          { userId: alice.id, contentId: hangoutWithAlice.id, status: 'YES' }
        ]
      })

      logger.info(`Created hangout with Alice from 2 weeks ago`)
    }

    if (bob) {
      // Create a hangout with Bob from 1 month ago
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      const hangoutWithBob = await prisma.content.create({
        data: {
          type: 'HANGOUT',
          title: 'Photography Walk in Central Park',
          description: 'Exploring the park with cameras',
          status: 'PUBLISHED',
          startTime: oneMonthAgo,
          endTime: new Date(oneMonthAgo.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
          venue: 'Central Park, New York',
          usersId: bob.id,
          createdAt: oneMonthAgo,
          lastActivityAt: oneMonthAgo
        }
      })

      // Add participants
      await prisma.content_participants.createMany({
        data: [
          { userId: rwhite.id, contentId: hangoutWithBob.id },
          { userId: bob.id, contentId: hangoutWithBob.id }
        ]
      })

      // Add RSVPs
      await prisma.rsvp.createMany({
        data: [
          { userId: rwhite.id, contentId: hangoutWithBob.id, status: 'YES' },
          { userId: bob.id, contentId: hangoutWithBob.id, status: 'YES' }
        ]
      })

      logger.info(`Created hangout with Bob from 1 month ago`)
    }

    logger.info('✅ Seed script completed successfully!')
    logger.info(`Created ${createdUsers.length} test users and made them friends with @rwhite`)
    logger.info('You can now test the Friends tab on your profile!')

  } catch (error) {
    logger.error('Error running seed script:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

