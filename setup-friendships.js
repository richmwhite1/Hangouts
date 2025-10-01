const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function setupFriendships() {
  try {
    console.log('Setting up friendships...')
    
    // Get all users
    const users = await db.user.findMany({
      select: { id: true, name: true, username: true }
    })
    
    console.log(`Found ${users.length} users`)
    
    // Create friendships between all users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i]
        const user2 = users[j]
        
        // Create friendship in both directions
        await db.friendship.upsert({
          where: {
            userId_friendId: {
              userId: user1.id,
              friendId: user2.id
            }
          },
          update: {
            status: 'ACTIVE'
          },
          create: {
            userId: user1.id,
            friendId: user2.id,
            status: 'ACTIVE'
          }
        })
        
        await db.friendship.upsert({
          where: {
            userId_friendId: {
              userId: user2.id,
              friendId: user1.id
            }
          },
          update: {
            status: 'ACTIVE'
          },
          create: {
            userId: user2.id,
            friendId: user1.id,
            status: 'ACTIVE'
          }
        })
        
        console.log(`Created friendship: ${user1.name} ↔ ${user2.name}`)
      }
    }
    
    console.log('\nAll friendships created successfully!')
    
    // Verify friendships
    const friendshipCount = await db.friendship.count()
    console.log(`Total friendships in database: ${friendshipCount}`)
    
  } catch (error) {
    console.error('Error setting up friendships:', error)
  } finally {
    await db.$disconnect()
  }
}

setupFriendships()
