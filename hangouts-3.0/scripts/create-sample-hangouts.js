require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating sample hangouts for @rwhite and friends...')

  // Find rwhite user
  const rwhite = await prisma.user.findUnique({
    where: { username: 'rwhite' }
  })

  if (!rwhite) {
    console.error('User @rwhite not found!')
    process.exit(1)
  }

  // Get rwhite's friends
  const friendships = await prisma.friendship.findMany({
    where: {
      userId: rwhite.id,
      status: 'ACTIVE'
    },
    include: {
      friend: true
    }
  })

  if (friendships.length === 0) {
    console.log('No friends found for @rwhite. Run create-test-friends.js first.')
    process.exit(1)
  }

  console.log(`Found ${friendships.length} friends`)

  // Create sample hangouts with different dates
  const now = new Date()
  const hangouts = [
    {
      friend: friendships[0].friend,
      title: 'Coffee at Blue Bottle',
      description: 'Catching up over coffee',
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      location: 'Blue Bottle Coffee, SF'
    },
    {
      friend: friendships[1].friend,
      title: 'Photography Walk',
      description: 'Exploring the city with cameras',
      startTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      location: 'Golden Gate Park'
    },
    {
      friend: friendships[2].friend,
      title: 'Dinner at The French Laundry',
      description: 'Celebrating Charlie\'s birthday',
      startTime: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      location: 'The French Laundry, Napa'
    },
    {
      friend: friendships[3].friend,
      title: 'Yoga Session',
      description: 'Morning yoga in the park',
      startTime: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      location: 'Dolores Park'
    },
    {
      friend: friendships[4].friend,
      title: 'Concert Night',
      description: 'Live music at The Fillmore',
      startTime: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
      location: 'The Fillmore, SF'
    }
  ]

  let created = 0
  let skipped = 0

  for (const hangoutData of hangouts) {
    try {
      // Check if hangout already exists
      const existing = await prisma.content.findFirst({
        where: {
          title: hangoutData.title,
          creatorId: rwhite.id,
          type: 'HANGOUT',
          status: 'PUBLISHED'
        }
      })

      if (existing) {
        console.log(`Hangout already exists: ${hangoutData.title}`)
        skipped++
        continue
      }

      // Create hangout
      const hangout = await prisma.content.create({
        data: {
          id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: hangoutData.title,
          description: hangoutData.description,
          type: 'HANGOUT',
          status: 'PUBLISHED',
          venue: hangoutData.location,
          startTime: hangoutData.startTime,
          endTime: new Date(hangoutData.startTime.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          creatorId: rwhite.id,
          createdAt: hangoutData.startTime,
          updatedAt: hangoutData.startTime
        }
      })

      // Add both users as participants
      await prisma.content_participants.createMany({
        data: [
          {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: rwhite.id,
            contentId: hangout.id
          },
          {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: hangoutData.friend.id,
            contentId: hangout.id
          }
        ],
        skipDuplicates: true
      })

      // Add RSVPs (both YES)
      await prisma.rsvp.createMany({
        data: [
          {
            id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: rwhite.id,
            contentId: hangout.id,
            status: 'YES'
          },
          {
            id: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: hangoutData.friend.id,
            contentId: hangout.id,
            status: 'YES'
          }
        ],
        skipDuplicates: true
      })

      // Update lastActivityAt if the field exists
      try {
        await prisma.$executeRaw`
          UPDATE content 
          SET last_activity_at = ${hangoutData.startTime}
          WHERE id = ${hangout.id}
        `
      } catch (e) {
        // Field might not exist yet, that's okay
      }

      console.log(`Created hangout: ${hangoutData.title} with ${hangoutData.friend.name}`)
      created++
    } catch (error) {
      console.error(`Error creating hangout ${hangoutData.title}:`, error.message)
    }
  }

  console.log(`\n✅ Summary:`)
  console.log(`   - Hangouts created: ${created}`)
  console.log(`   - Hangouts skipped: ${skipped}`)
  console.log(`\n@rwhite now has hangout history with friends!`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

