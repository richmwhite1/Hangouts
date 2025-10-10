const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seedFriends() {
  try {
    console.log('🌱 Seeding friends for Karl...')

    // First, find or create Karl
    let karl = await prisma.user.findUnique({
      where: { email: 'karl@email.com' }
    })

    if (!karl) {
      console.log('Creating Karl...')
      karl = await prisma.user.create({
        data: {
          id: `user_${Date.now()}_karl`,
          email: 'karl@email.com',
          username: 'karl',
          name: 'Karl',
          password: await bcrypt.hash('Password1!', 10),
          isActive: true
        }
      })
    }

    // Create 5 friends for Karl
    const friends = [
      { name: 'Alice', username: 'alice', email: 'alice@email.com' },
      { name: 'Bob', username: 'bob', email: 'bob@email.com' },
      { name: 'Charlie', username: 'charlie', email: 'charlie@email.com' },
      { name: 'Diana', username: 'diana', email: 'diana@email.com' },
      { name: 'Eve', username: 'eve', email: 'eve@email.com' }
    ]

    for (const friend of friends) {
      const existingFriend = await prisma.user.findUnique({
        where: { email: friend.email }
      })

      if (!existingFriend) {
        await prisma.user.create({
          data: {
            id: `user_${Date.now()}_${friend.username}`,
            email: friend.email,
            username: friend.username,
            name: friend.name,
            password: await bcrypt.hash('Password1!', 10),
            isActive: true
          }
        })
        console.log(`✅ Created friend: ${friend.name}`)
      } else {
        console.log(`👤 Friend already exists: ${friend.name}`)
      }
    }

    // Create some sample hangouts with these friends to make them "recent"
    const allUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['karl@email.com', 'alice@email.com', 'bob@email.com', 'charlie@email.com', 'diana@email.com', 'eve@email.com']
        }
      }
    })

    const karlUser = allUsers.find(u => u.email === 'karl@email.com')
    const friendUsers = allUsers.filter(u => u.email !== 'karl@email.com')

    // Create a sample hangout with friends
    if (karlUser && friendUsers.length > 0) {
      const hangout = await prisma.content.create({
        data: {
          id: `hangout_${Date.now()}_sample`,
          type: 'HANGOUT',
          title: 'Sample Hangout with Friends',
          description: 'A sample hangout to establish friend relationships',
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          privacyLevel: 'PUBLIC',
          creatorId: karlUser.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Add Karl and friends as participants
      const participants = [karlUser, ...friendUsers.slice(0, 3)].map(user => ({
        id: `participant_${Date.now()}_${user.id}`,
        contentId: hangout.id,
        userId: user.id,
        role: user.id === karlUser.id ? 'CREATOR' : 'MEMBER',
        canEdit: user.id === karlUser.id
      }))

      await prisma.content_participants.createMany({
        data: participants
      })

      console.log('✅ Created sample hangout with friends')
    }

    console.log('🎉 Friends seeding completed!')
  } catch (error) {
    console.error('❌ Error seeding friends:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedFriends()
