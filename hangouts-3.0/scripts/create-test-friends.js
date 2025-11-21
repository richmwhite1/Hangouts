require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating test users and friendships for @rwhite...')

  // Find rwhite user
  const rwhite = await prisma.user.findUnique({
    where: { username: 'rwhite' }
  })

  if (!rwhite) {
    console.error('User @rwhite not found! Please make sure the user exists in the database.')
    process.exit(1)
  }

  console.log(`Found user: ${rwhite.name} (@${rwhite.username})`)

  // Create test users
  const testUsers = [
    {
      email: 'alice.test@example.com',
      username: 'alice',
      name: 'Alice Johnson',
      bio: 'Love hiking and coffee! ☕',
      location: 'San Francisco, CA',
      avatar: null
    },
    {
      email: 'bob.test@example.com',
      username: 'bob',
      name: 'Bob Smith',
      bio: 'Photography enthusiast 📸',
      location: 'New York, NY',
      avatar: null
    },
    {
      email: 'charlie.test@example.com',
      username: 'charlie',
      name: 'Charlie Brown',
      bio: 'Foodie and travel lover ✈️',
      location: 'Los Angeles, CA',
      avatar: null
    },
    {
      email: 'diana.test@example.com',
      username: 'diana',
      name: 'Diana Prince',
      bio: 'Fitness and wellness 🧘',
      location: 'Seattle, WA',
      avatar: null
    },
    {
      email: 'eve.test@example.com',
      username: 'eve',
      name: 'Eve Martinez',
      bio: 'Music and art enthusiast 🎨',
      location: 'Austin, TX',
      avatar: null
    }
  ]

  const createdUsers = []

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { username: userData.username }
      })

      if (!user) {
        user = await prisma.user.create({
          data: userData
        })
        console.log(`Created user: ${user.name} (@${user.username})`)
      } else {
        console.log(`User already exists: ${user.name} (@${user.username})`)
      }

      createdUsers.push(user)
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation - user already exists
        const existingUser = await prisma.user.findUnique({
          where: { username: userData.username }
        })
        if (existingUser) {
          createdUsers.push(existingUser)
          console.log(`User already exists: ${existingUser.name} (@${existingUser.username})`)
        }
      } else {
        console.error(`Error creating user ${userData.username}:`, error.message)
      }
    }
  }

  // Create friendships between rwhite and test users
  console.log('\nCreating friendships...')
  let friendshipsCreated = 0
  let friendshipsSkipped = 0

  for (const friend of createdUsers) {
    try {
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
        console.log(`Friendship already exists: ${rwhite.name} <-> ${friend.name}`)
        friendshipsSkipped++
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

      console.log(`Created friendship: ${rwhite.name} <-> ${friend.name}`)
      friendshipsCreated++
    } catch (error) {
      console.error(`Error creating friendship with ${friend.username}:`, error.message)
    }
  }

  console.log(`\n✅ Summary:`)
  console.log(`   - Users checked/created: ${createdUsers.length}`)
  console.log(`   - Friendships created: ${friendshipsCreated}`)
  console.log(`   - Friendships skipped (already exist): ${friendshipsSkipped}`)
  console.log(`\n@rwhite now has ${friendshipsCreated + friendshipsSkipped} friends!`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

