// Test script to check users in production database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...')
    
    const userCount = await prisma.user.count()
    console.log(`📊 Total users: ${userCount}`)
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      console.log('👥 Recent users:')
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (@${user.username}) - ${user.email}`)
      })
    } else {
      console.log('❌ No users found in database')
    }
    
    // Check friendships
    const friendshipCount = await prisma.friendship.count()
    console.log(`🤝 Total friendships: ${friendshipCount}`)
    
    // Check hangouts
    const hangoutCount = await prisma.hangout.count()
    console.log(`🎉 Total hangouts: ${hangoutCount}`)
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
