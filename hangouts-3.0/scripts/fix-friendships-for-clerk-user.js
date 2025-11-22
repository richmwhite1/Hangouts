require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Fixing friendships for Clerk user...')

  // Find the Clerk user by Clerk ID
  const clerkUserId = 'user_33r1u7EtQAJ6do5Ghc0pnTwd94B'
  
  const clerkUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId }
  })

  if (!clerkUser) {
    console.error(`Clerk user with ID ${clerkUserId} not found in database!`)
    console.log('\nAvailable users:')
    const allUsers = await prisma.user.findMany({
      select: { id: true, clerkId: true, username: true, email: true, name: true }
    })
    allUsers.forEach(u => {
      console.log(`  - ${u.name} (@${u.username}) - Clerk: ${u.clerkId || 'NONE'} - DB ID: ${u.id}`)
    })
    process.exit(1)
  }

  console.log(`Found Clerk user: ${clerkUser.name} (@${clerkUser.username || 'NO USERNAME'}) - DB ID: ${clerkUser.id}`)

  // Check if this user has any friendships
  const existingFriendships = await prisma.friendship.findMany({
    where: {
      userId: clerkUser.id,
      status: 'ACTIVE'
    },
    include: {
      friend: true
    }
  })

  console.log(`\nCurrent friendships for this user: ${existingFriendships.length}`)
  existingFriendships.forEach(f => {
    console.log(`  - ${f.friend.name} (@${f.friend.username})`)
  })

  // Find the rwhite user in database
  const rwhite = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'rwhite' },
        { email: 'rwhite@victig.com' }
      ]
    }
  })

  if (!rwhite) {
    console.error('User @rwhite not found in database!')
    process.exit(1)
  }

  console.log(`\nFound @rwhite user: ${rwhite.name} (@${rwhite.username}) - DB ID: ${rwhite.id}`)

  // If the Clerk user is NOT rwhite, we need to either:
  // 1. Link the Clerk account to rwhite, OR
  // 2. Create friendships for the Clerk user

  if (clerkUser.id !== rwhite.id) {
    console.log('\n⚠️  Clerk user is different from @rwhite!')
    console.log('Options:')
    console.log('1. Update Clerk user to link to @rwhite (if they are the same person)')
    console.log('2. Create friendships for the Clerk user instead')
    
    // For now, let's create friendships for the Clerk user
    console.log('\nCreating friendships for Clerk user...')
    
    // Get all test users
    const testUsers = await prisma.user.findMany({
      where: {
        username: {
          in: ['alice', 'bob', 'charlie', 'diana', 'eve']
        }
      }
    })

    let created = 0
    for (const friend of testUsers) {
      // Check if friendship already exists
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: clerkUser.id, friendId: friend.id },
            { userId: friend.id, friendId: clerkUser.id }
          ],
          status: 'ACTIVE'
        }
      })

      if (existing) {
        console.log(`  Friendship already exists: ${clerkUser.name} <-> ${friend.name}`)
        continue
      }

      // Create bidirectional friendships
      await prisma.friendship.createMany({
        data: [
          {
            userId: clerkUser.id,
            friendId: friend.id,
            status: 'ACTIVE'
          },
          {
            userId: friend.id,
            friendId: clerkUser.id,
            status: 'ACTIVE'
          }
        ],
        skipDuplicates: true
      })

      console.log(`  Created friendship: ${clerkUser.name} <-> ${friend.name}`)
      created++
    }

    console.log(`\n✅ Created ${created} new friendships for Clerk user`)
  } else {
    console.log('\n✅ Clerk user matches @rwhite - friendships should already exist')
    
    // Verify friendships exist
    const friendships = await prisma.friendship.findMany({
      where: {
        userId: clerkUser.id,
        status: 'ACTIVE'
      },
      include: {
        friend: true
      }
    })

    console.log(`\nFriendships found: ${friendships.length}`)
    friendships.forEach(f => {
      console.log(`  - ${f.friend.name} (@${f.friend.username})`)
    })
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


