const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive seed...')

  // Create users
  const users = [
    {
      email: 'karl@email.com',
      username: 'karl',
      name: 'Karl Johnson',
      avatar: '/friendly-man-avatar.jpg',
      password: 'Password1!'
    },
    {
      email: 'alice@email.com',
      username: 'alice',
      name: 'Alice Smith',
      avatar: '/professional-woman-avatar.png',
      password: 'Password1!'
    },
    {
      email: 'bob@email.com',
      username: 'bob',
      name: 'Bob Wilson',
      avatar: '/outdoorsy-man-avatar.jpg',
      password: 'Password1!'
    },
    {
      email: 'charlie@email.com',
      username: 'charlie',
      name: 'Charlie Brown',
      avatar: '/man-avatar.png',
      password: 'Password1!'
    },
    {
      email: 'diana@email.com',
      username: 'diana',
      name: 'Diana Prince',
      avatar: '/athletic-woman-avatar.jpg',
      password: 'Password1!'
    },
    {
      email: 'eve@email.com',
      username: 'eve',
      name: 'Eve Adams',
      avatar: '/diverse-woman-avatar.png',
      password: 'Password1!'
    },
    {
      email: 'frank@email.com',
      username: 'frank',
      name: 'Frank Miller',
      avatar: '/placeholder-avatar.png',
      password: 'Password1!'
    },
    {
      email: 'grace@email.com',
      username: 'grace',
      name: 'Grace Lee',
      avatar: '/placeholder-avatar.png',
      password: 'Password1!'
    }
  ]

  console.log('👥 Creating users...')
  const createdUsers = []
  
  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        username: userData.username,
        name: userData.name,
        avatar: userData.avatar,
        password: hashedPassword,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    createdUsers.push(user)
    console.log(`✅ Created user: ${user.name} (${user.email})`)
  }

  console.log(`\n🤝 Making all ${createdUsers.length} users friends with each other...`)
  
  // Create friendships between all users
  let friendshipCount = 0
  for (let i = 0; i < createdUsers.length; i++) {
    for (let j = i + 1; j < createdUsers.length; j++) {
      const user1 = createdUsers[i]
      const user2 = createdUsers[j]

      // Create bidirectional friendship
      try {
        await prisma.friendship.createMany({
          data: [
            {
              id: `friendship_${Date.now()}_${i}_${j}`,
              userId: user1.id,
              friendId: user2.id,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: `friendship_${Date.now()}_${j}_${i}`,
              userId: user2.id,
              friendId: user1.id,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        })
      } catch (error) {
        // Skip if friendship already exists
        if (!error.message.includes('Unique constraint')) {
          throw error
        }
      }
      
      friendshipCount += 2
    }
  }

  console.log(`✅ Created ${friendshipCount} friendship relationships`)

  // Create a sample hangout with friends
  console.log('\n🎉 Creating sample hangout...')
  const karl = createdUsers.find(u => u.email === 'karl@email.com')
  const alice = createdUsers.find(u => u.email === 'alice@email.com')
  const bob = createdUsers.find(u => u.email === 'bob@email.com')

  if (karl && alice && bob) {
    const hangout = await prisma.content.create({
      data: {
        id: `hangout_${Date.now()}_sample`,
        type: 'HANGOUT',
        title: 'Weekend Adventure',
        description: 'Let\'s go on a fun weekend adventure together!',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        privacyLevel: 'PUBLIC',
        creatorId: karl.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Add participants
    const participants = [
      { userId: karl.id, role: 'CREATOR', canEdit: true },
      { userId: alice.id, role: 'MEMBER', canEdit: false },
      { userId: bob.id, role: 'MEMBER', canEdit: false }
    ]

    for (const participant of participants) {
      await prisma.content_participants.create({
        data: {
          id: `participant_${Date.now()}_${participant.userId}`,
          contentId: hangout.id,
          userId: participant.userId,
          role: participant.role,
          canEdit: participant.canEdit,
          invitedAt: new Date()
        }
      })
    }

    console.log(`✅ Created sample hangout: ${hangout.title}`)
  }

  // Verify friendships
  console.log('\n🔍 Verifying friendships...')
  for (const user of createdUsers) {
    const friends = await prisma.friendship.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { friend: true }
    })
    console.log(`${user.name} has ${friends.length} friends: ${friends.map(f => f.friend.name).join(', ')}`)
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log(`📊 Summary:`)
  console.log(`   - Users created: ${createdUsers.length}`)
  console.log(`   - Friendships created: ${friendshipCount}`)
  console.log(`   - Sample hangout created: Yes`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
