const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking database state...\n')
    
    // Check all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isActive: true
      }
    })
    
    console.log('👥 Users in database:')
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - @${user.username} - Active: ${user.isActive}`)
    })
    
    console.log(`\nTotal users: ${users.length}\n`)
    
    // Check all friendships
    const friendships = await prisma.friendship.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })
    
    console.log('🤝 Friendships in database:')
    friendships.forEach(friendship => {
      console.log(`  - ${friendship.user.name} (@${friendship.user.username}) ↔ ${friendship.friend.name} (@${friendship.friend.username}) - Status: ${friendship.status}`)
    })
    
    console.log(`\nTotal friendships: ${friendships.length}\n`)
    
    // Check for duplicates
    const duplicateFriendships = []
    const seenPairs = new Set()
    
    friendships.forEach(friendship => {
      const pair1 = `${friendship.userId}-${friendship.friendId}`
      const pair2 = `${friendship.friendId}-${friendship.userId}`
      
      if (seenPairs.has(pair1) || seenPairs.has(pair2)) {
        duplicateFriendships.push(friendship)
      } else {
        seenPairs.add(pair1)
        seenPairs.add(pair2)
      }
    })
    
    if (duplicateFriendships.length > 0) {
      console.log('⚠️  DUPLICATE FRIENDSHIPS FOUND:')
      duplicateFriendships.forEach(friendship => {
        console.log(`  - ${friendship.user.name} ↔ ${friendship.friend.name} (ID: ${friendship.id})`)
      })
    } else {
      console.log('✅ No duplicate friendships found')
    }
    
  } catch (error) {
    console.error('❌ Error checking database state:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseState()






