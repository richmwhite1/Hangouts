#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seedProduction() {
  console.log('🌱 Starting production database seeding...')
  
  try {
    // Check if users already exist
    const existingUsers = await prisma.user.count()
    if (existingUsers > 0) {
      console.log(`✅ Database already has ${existingUsers} users, skipping seed`)
      return
    }

    // Create test users
    const users = [
      {
        email: 'richard@example.com',
        username: 'richard',
        name: 'Richard White',
        password: await bcrypt.hash('Password1!', 12),
        isVerified: true,
        isActive: true
      },
      {
        email: 'hillary@example.com',
        username: 'hillaryclinton',
        name: 'Hillary Clinton',
        password: await bcrypt.hash('Password1!', 12),
        isVerified: true,
        isActive: true
      },
      {
        email: 'ted@example.com',
        username: 'tedjohnson',
        name: 'Ted Johnson',
        password: await bcrypt.hash('Password1!', 12),
        isVerified: true,
        isActive: true
      },
      {
        email: 'bill@example.com',
        username: 'billbev',
        name: 'Bill Beverly',
        password: await bcrypt.hash('Password1!', 12),
        isVerified: true,
        isActive: true
      },
      {
        email: 'sarah@example.com',
        username: 'sarahsmith',
        name: 'Sarah Smith',
        password: await bcrypt.hash('Password1!', 12),
        isVerified: true,
        isActive: true
      },
      {
        email: 'mike@example.com',
        username: 'mikejones',
        name: 'Mike Jones',
        password: await bcrypt.hash('Password1!', 12),
        isVerified: true,
        isActive: true
      }
    ]

    console.log('👥 Creating users...')
    for (const userData of users) {
      const user = await prisma.user.create({
        data: userData
      })
      console.log(`✅ Created user: ${user.name} (${user.email})`)
    }

    // Create some friendships
    console.log('🤝 Creating friendships...')
    const allUsers = await prisma.user.findMany()
    
    // Create friendships between users
    const friendships = [
      { userId: allUsers[0].id, friendId: allUsers[1].id },
      { userId: allUsers[0].id, friendId: allUsers[2].id },
      { userId: allUsers[1].id, friendId: allUsers[2].id },
      { userId: allUsers[2].id, friendId: allUsers[3].id },
      { userId: allUsers[3].id, friendId: allUsers[4].id },
      { userId: allUsers[4].id, friendId: allUsers[5].id }
    ]

    for (const friendship of friendships) {
      await prisma.friendship.create({
        data: friendship
      })
      console.log(`✅ Created friendship between users`)
    }

    // Create a sample hangout
    console.log('🏠 Creating sample hangout...')
    const hangout = await prisma.content.create({
      data: {
        id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'HANGOUT',
        title: 'Coffee Meetup',
        description: "Let's grab coffee together!",
        location: 'Starbucks Downtown',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow + 2 hours
        status: 'PUBLISHED',
        privacyLevel: 'FRIENDS_ONLY',
        creatorId: allUsers[0].id,
        maxParticipants: 5
      }
    })

    console.log(`✅ Created hangout: ${hangout.title}`)

    console.log('🎉 Production database seeding completed successfully!')
    console.log(`📊 Created ${users.length} users and ${friendships.length} friendships`)

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedProduction().catch((error) => {
  console.error('❌ Seed script failed:', error)
  process.exit(1)
})








